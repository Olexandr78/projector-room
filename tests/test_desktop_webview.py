import pathlib
import sys
import threading
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import main as app


class FakeEvent:
    def __init__(self):
        self.handlers = []

    def __iadd__(self, handler):
        self.handlers.append(handler)
        return self


class FakeAction:
    """Model a .NET System.Action delegate: its Invoke result is always void."""

    def __init__(self, callback):
        self.callback = callback

    def __call__(self):
        self.callback()


class FakePoint:
    def __init__(self, x, y):
        self.X, self.Y = x, y


class FakeSize:
    def __init__(self, width, height):
        self.Width, self.Height = width, height


class FakeControl:
    def __init__(self, parent):
        self._parent = parent
        self.parent_assignments = 0
        self.Dock = "Fill"
        self.Location = FakePoint(0, 0)
        self.Size = FakeSize(1, 1)
        self.Visible = False
        self.NavigationCompleted = FakeEvent()
        self.bring_to_front_count = 0

    @property
    def Parent(self):
        return self._parent

    @Parent.setter
    def Parent(self, value):
        self.parent_assignments += 1
        self._parent = value

    def BringToFront(self):
        self.bring_to_front_count += 1


class FakeForm:
    def __init__(self, width=1280, height=720, invoke_required=True):
        self.InvokeRequired = invoke_required
        self.ClientSize = types.SimpleNamespace(Width=width, Height=height)
        self.invoke_count = 0
        self.hide_count = 0
        self.invoke_entered = None
        self.invoke_release = None

    def Invoke(self, callback):
        self.invoke_count += 1
        if self.invoke_entered is not None:
            self.invoke_entered.set()
        if self.invoke_release is not None:
            if not self.invoke_release.wait(2):
                raise TimeoutError("fake UI thread was not released")
        callback()
        # Real System.Action returns void, so Control.Invoke returns None.
        return None

    def Hide(self):
        self.hide_count += 1


class FakeWindow:
    def __init__(self, native=None):
        self.native = native
        self.events = types.SimpleNamespace(shown=FakeEvent(), loaded=FakeEvent())
        self.url = "about:blank"
        self.loaded_urls = []
        self.show_count = 0
        self.evaluated_scripts = []

    def load_url(self, url):
        self.url = url
        self.loaded_urls.append(url)

    def get_current_url(self):
        return self.url

    def show(self):
        self.show_count += 1

    def evaluate_js(self, script):
        self.evaluated_scripts.append(script)


def install_fake_dotnet_modules():
    system = types.ModuleType("System")
    drawing = types.ModuleType("System.Drawing")
    windows = types.ModuleType("System.Windows")
    forms = types.ModuleType("System.Windows.Forms")

    class DockStyle:
        pass

    setattr(DockStyle, "None", "DockStyle.None")
    system.Action = FakeAction
    drawing.Point = FakePoint
    drawing.Size = FakeSize
    forms.DockStyle = DockStyle
    system.Drawing = drawing
    system.Windows = windows
    windows.Forms = forms

    sys.modules["System"] = system
    sys.modules["System.Drawing"] = drawing
    sys.modules["System.Windows"] = windows
    sys.modules["System.Windows.Forms"] = forms


install_fake_dotnet_modules()


class DesktopWebviewBridgeTests(unittest.TestCase):
    def make_api(self):
        api = app.DesktopWebviewApi("http://127.0.0.1:8123/")
        main_form = FakeForm(1344, 821)
        projector_form = FakeForm(1264, 681)
        teacher_child_form = FakeForm()
        projector_child_form = FakeForm()

        teacher_control = FakeControl(teacher_child_form)
        projector_control = FakeControl(projector_child_form)
        teacher_child_form.webview = teacher_control
        projector_child_form.webview = projector_control

        api.main_window = FakeWindow(main_form)
        api.projector_window = FakeWindow(projector_form)
        api.teacher_browser_window = FakeWindow(teacher_child_form)
        api.projector_browser_window = FakeWindow(projector_child_form)
        return api, teacher_control, projector_control, main_form, projector_form

    def test_invoke_void_action_is_success_not_retry(self):
        api, teacher, _, _, _ = self.make_api()
        api.preview_bounds = (12, 268, 875, 480)

        with patch.object(app.sys, "platform", "win32"):
            self.assertTrue(api._attach_browser_surface("teacher"))

        self.assertEqual(teacher.Parent, api.main_window.native)
        self.assertEqual(teacher.parent_assignments, 1)
        self.assertEqual(teacher.Dock, "DockStyle.None")
        self.assertEqual((teacher.Location.X, teacher.Location.Y), (12, 268))
        self.assertEqual((teacher.Size.Width, teacher.Size.Height), (875, 480))
        self.assertEqual(len(teacher.NavigationCompleted.handlers), 1)

    def test_invoke_preserves_callback_false_result(self):
        api, *_ = self.make_api()
        form = FakeForm()
        self.assertFalse(api._invoke_on_form(form, lambda: False))
        self.assertTrue(api._invoke_on_form(form, lambda: True))

    def test_zero_sized_preview_is_not_marked_as_attached(self):
        api, teacher, _, _, _ = self.make_api()
        api.preview_bounds = (0, 0, 0, 0)
        with patch.object(app.sys, "platform", "win32"):
            with patch.object(api, "_schedule_attach_retry") as schedule:
                self.assertFalse(api._attach_browser_surface("teacher"))
        self.assertEqual(teacher.parent_assignments, 0)
        schedule.assert_called_once_with("teacher", 0)

    def test_second_attach_only_resizes_existing_control(self):
        api, teacher, _, _, _ = self.make_api()

        with patch.object(app.sys, "platform", "win32"):
            self.assertTrue(api._attach_browser_surface("teacher"))
            self.assertTrue(api._attach_browser_surface("teacher"))

        self.assertEqual(teacher.parent_assignments, 1)
        self.assertEqual(len(teacher.NavigationCompleted.handlers), 1)
        self.assertEqual(teacher.bring_to_front_count, 2)

    def test_position_uses_invoke_even_when_invoke_returns_none(self):
        api, teacher, _, _, _ = self.make_api()
        with patch.object(app.sys, "platform", "win32"):
            self.assertTrue(api._attach_browser_surface("teacher"))
            api.preview_bounds = (40, 50, 640, 360)
            self.assertTrue(api._position_browser_surface("teacher"))

        self.assertEqual((teacher.Location.X, teacher.Location.Y), (40, 50))
        self.assertEqual((teacher.Size.Width, teacher.Size.Height), (640, 360))

    def test_concurrent_attach_is_serialized(self):
        api, teacher, _, main_form, _ = self.make_api()
        entered = threading.Event()
        release = threading.Event()
        main_form.invoke_entered = entered
        main_form.invoke_release = release

        with patch.object(app.sys, "platform", "win32"):
            worker = threading.Thread(target=lambda: api._attach_browser_surface("teacher"))
            worker.start()
            self.assertTrue(entered.wait(1), "first attach did not reach UI Invoke")
            # A simultaneous second request must not reparent the same control.
            self.assertFalse(api._attach_browser_surface("teacher"))
            release.set()
            worker.join(2)

        self.assertFalse(worker.is_alive(), "attach worker did not finish")
        self.assertEqual(teacher.parent_assignments, 1)

    def test_open_site_uses_precreated_windows(self):
        api, _, _, _, _ = self.make_api()
        with patch.object(app.sys, "platform", "win32"):
            with patch.object(api, "_schedule_attach_retry") as schedule:
                self.assertTrue(api.open_site("example.com"))

        self.assertEqual(api.teacher_browser_window.loaded_urls, ["https://example.com"])
        self.assertEqual(api.projector_browser_window.loaded_urls, ["https://example.com"])
        self.assertGreaterEqual(schedule.call_count, 0)

    def test_open_projector_shows_existing_window_without_creating_another(self):
        api, _, _, _, _ = self.make_api()
        projector = api.projector_window
        with patch.object(app.sys, "platform", "win32"):
            self.assertTrue(api.open_projector())
        self.assertEqual(projector.show_count, 1)
        self.assertIs(api.projector_window, projector)

    def test_one_retry_timer_per_browser(self):
        api, *_ = self.make_api()
        created = []

        class FakeTimer:
            def __init__(self, interval, callback):
                self.interval = interval
                self.callback = callback
                self.daemon = False
                self.name = ""

            def start(self):
                created.append(self)

        with patch.object(app.threading, "Timer", FakeTimer):
            self.assertTrue(api._schedule_attach_retry("teacher", 0))
            self.assertFalse(api._schedule_attach_retry("teacher", 0))

        self.assertEqual(len(created), 1)


if __name__ == "__main__":
    unittest.main()
