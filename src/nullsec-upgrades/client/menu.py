# -*- coding: utf-8 -*-
import json
import time
import blue
import uthread
import evejs_mod_menu as mods
from carbonui import uiconst
from carbonui.control.window import Window
from carbonui.control.button import Button
from carbonui.primitives.container import Container
from eve.client.script.ui.control.eveLabel import EveLabelMedium
from xml.sax.saxutils import escape
try:
    from carbonui.control.scrollContainer import ScrollContainer
except ImportError:
    ScrollContainer = None

_allowed = False
_alive = True


def snapshot(view='index'):
    return json.loads(sm.RemoteSvc('slash').SlashCmd('/nullsecindexsnapshot ' + view))


def safe_text(value):
    return escape(unicode(value))


class NullsecUpgradesWindow(Window):
    # New ID intentionally resets the old saved narrow window size once.
    default_windowID = 'NullsecUpgradesWindowV2'
    default_caption = 'Nullsec Upgrades'
    default_width = 720
    default_height = 650
    default_minSize = (460, 320)
    default_scope = uiconst.SCOPE_INGAME

    def ApplyAttributes(self, attributes):
        Window.ApplyAttributes(self, attributes)
        self.character = session.charid
        self.generation = 0
        self.current_tab = None
        self.validation_busy = False
        self.expanded_features = set()
        self.validation_rows = []
        tabs = Container(parent=self.content, align=uiconst.TOTOP, height=32)
        self.index_tab = Button(parent=tabs, align=uiconst.TOLEFT, label='Industrial Index', func=self.show_index)
        self.validation_tab = Button(parent=tabs, align=uiconst.TOLEFT, label='Feature Validation', func=self.show_validation)
        self.panel = Container(parent=self.content, align=uiconst.TOALL)
        self.show_validation()

    def valid(self, generation):
        return (_alive and _allowed and not self.destroyed and generation == self.generation and
                self.character == session.charid)

    def select(self, tab):
        self.generation += 1
        self.current_tab = tab
        self.panel.Flush()
        self.index_tab.Disable() if tab == 'index' else self.index_tab.Enable()
        self.validation_tab.Disable() if tab == 'validation' else self.validation_tab.Enable()
        return self.generation

    def show_index(self, *args):
        generation = self.select('index')
        self.status = EveLabelMedium(parent=self.panel, align=uiconst.TOTOP, text='Waiting for server...')
        uthread.new(self.refresh_index, generation)

    def refresh_index(self, generation):
        # Existing once-per-second index refresh, only while this tab is selected.
        while self.valid(generation):
            system = session.solarsystemid2
            try:
                d = snapshot('index')
                if not self.valid(generation):
                    return
                if not d.get('authorized'):
                    self.Close()
                    return
                if not d.get('progressionEnabled'):
                    self.status.text = 'Industrial index progression is disabled.'
                    return
                if system != session.solarsystemid2 or not d.get('available') or d.get('id') != system:
                    self.status.text = 'Unavailable in this system.'
                else:
                    self.status.text = ('System: %s<br>Next settlement: %ss<br>Mined this cycle: %.2f m3<br>Multiplier: %.2fx<br>Current index: %.4f levels<br>Pending: +%.4f levels<br>Projected: %.4f levels' % (system,d['remaining'],d['volume'],d['multiplier'],d['current']/100.0,d['pending']/100.0,d['projected']/100.0))
            except Exception:
                if self.valid(generation):
                    self.status.text = 'Unavailable'
            if self.valid(generation):
                blue.pyos.synchro.SleepWallclock(1000)

    def show_validation(self, *args):
        self.select('validation')
        self.validation_busy = False
        EveLabelMedium(parent=self.panel, align=uiconst.TOTOP, text='Forced checks use isolated fixtures. Live evidence is separate.')
        controls = Container(parent=self.panel, align=uiconst.TOTOP, height=30)
        self.reload_button = Button(parent=controls, align=uiconst.TOLEFT, label='Refresh', func=self.reload_validation)
        self.inspect_button = Button(parent=controls, align=uiconst.TOLEFT, label='Inspect Live', func=lambda *a: self.request_validation('inspect'))
        self.test_all_button = Button(parent=controls, align=uiconst.TOLEFT, label='Test All', func=lambda *a: self.run_validation_test('all'))
        self.status = EveLabelMedium(parent=self.panel, align=uiconst.TOTOP, text='Waiting for server...')
        self.validation_body = ScrollContainer(parent=self.panel, align=uiconst.TOALL) if ScrollContainer is not None else None
        self.test_buttons = []
        if self.validation_body is None:
            self.status.text = 'Scrollable validation is unavailable on this client.'
            for button in (self.reload_button, self.inspect_button, self.test_all_button):
                button.Disable()
            return
        self.render_validation()
        self.reload_validation()

    def set_validation_busy(self, busy):
        self.validation_busy = busy
        for button in [self.reload_button, self.test_all_button, self.inspect_button] + self.test_buttons:
            button.Disable() if busy else button.Enable()

    def reload_validation(self, *args):
        self.request_validation('validation')

    def run_validation_test(self, key, *args):
        self.request_validation('test ' + key)

    def request_validation(self, view):
        generation = self.generation
        if self.current_tab != 'validation' or not self.valid(generation) or self.validation_busy or self.validation_body is None:
            return
        self.set_validation_busy(True)
        self.status.text = 'Running isolated test...' if view.startswith('test ') else 'Refreshing...'
        uthread.new(self.read_validation, generation, view)

    def read_validation(self, generation, view):
        if not self.valid(generation):
            return
        try:
            d = snapshot(view)
            if not self.valid(generation):
                return
            if not d.get('authorized'):
                self.Close()
                return
            if not d.get('available'):
                self.status.text = 'Validation unavailable.'
                return
            self.validation_rows = d.get('features', [])
            keys = set(row.get('key') for row in self.validation_rows if row.get('key'))
            self.expanded_features.intersection_update(keys)
            self.render_validation()
            rows = self.validation_rows
            self.status.text = safe_text(d.get('message') or ('Select a feature to test or Test All.' if rows else 'No enabled features to validate.'))
        except Exception:
            if self.valid(generation):
                self.status.text = 'Validation unavailable.'
        finally:
            if self.valid(generation):
                self.set_validation_busy(False)

    def toggle_feature(self, key, *args):
        # This is a purely local UI action. No RPC, timers or validation work.
        if self.current_tab != 'validation' or not self.valid(self.generation):
            return
        if key in self.expanded_features:
            self.expanded_features.remove(key)
        else:
            self.expanded_features.add(key)
        self.render_validation()

    def make_expand_callback(self, key):
        def callback(*args):
            self.toggle_feature(key)
        return callback

    def validation_label(self, text, indent=8, bottom=3):
        # Native TOTOP labels calculate height from their wrapped text. Put them
        # directly in the scroll stack, never in a fixed-height feature block.
        return EveLabelMedium(parent=self.validation_body, align=uiconst.TOTOP,
                              padLeft=indent, padRight=8, padTop=2,
                              padBottom=bottom, text=text)

    def stamp(self, value):
        try:
            return time.strftime('%H:%M:%S', time.localtime(value / 1000.0)) if value else '-'
        except (TypeError, ValueError, OverflowError, OSError):
            return '-'

    def detail(self, title, value):
        text = safe_text(value if value is not None else '-').replace('\r\n', '\n').replace('\r', '\n').replace('\n', '<br>')
        self.validation_label('<b>%s:</b> %s' % (title, text), indent=16)

    def render_validation(self):
        body = self.validation_body
        if body is None or self.current_tab != 'validation' or not self.valid(self.generation):
            return
        states = {'Passed': ('Working', '0xff66cc66'), 'Failed': ('Not working', '0xffee6666'), 'Pending': ('Pending', '0xffe5bd69')}
        # Preserve scroll position when the native client exposes the API.
        # The expanded keys themselves survive every redraw unconditionally.
        position = None
        try:
            position = body.GetPosition()
        except Exception:
            pass
        body.Flush()
        self.test_buttons = []
        if not self.validation_rows:
            self.validation_label('No feature results loaded. Use Refresh.')
        for row in self.validation_rows:
            key = row.get('key')
            expanded = key in self.expanded_features
            label, color = states.get(row.get('status'), states['Pending'])
            test = row.get('test') or {}
            tested, tcolor = states.get(test.get('status'), ('Not run', '0xffaaaaaa'))
            hook = test.get('hook') or {}
            hcolor = '0xff66cc66' if hook.get('status') == 'Ready' else '0xffe5bd69'
            name = safe_text(row.get('label', 'Feature'))
            if key:
                Button(parent=body, align=uiconst.TOTOP, height=28,
                       padLeft=4, padRight=4, padTop=4,
                       label=('- ' if expanded else '+ ') + name,
                       func=self.make_expand_callback(key))
            else:
                self.validation_label('<b>%s</b>' % name)
            self.validation_label('Forced: <color=%s>%s</color>   Live: <color=%s>%s</color>   Hook: <color=%s>%s</color>' % (tcolor, tested, color, label, hcolor, safe_text(hook.get('status', 'Not checked'))), bottom=7)
            if not expanded:
                continue
            if key:
                bar = Container(parent=body, align=uiconst.TOTOP, height=28, padLeft=16, padRight=8)
                button = Button(parent=bar, align=uiconst.TOLEFT, label='Run Test', func=self.make_test_callback(key))
                self.test_buttons.append(button)
                if self.validation_busy:
                    button.Disable()
            self.detail('Forced test', test.get('detail', 'Run Test to check this feature.'))
            self.detail('Live evidence', row.get('detail', 'Awaiting evidence'))
            self.detail('Hook', hook.get('detail', 'Not checked'))
            inspection = row.get('inspection') or {}
            self.detail('Test time', '%s (%s ms)' % (self.stamp(test.get('at')), test.get('durationMs', '-')))
            self.detail('Live evidence time', self.stamp(row.get('at')))
            self.detail('Inspection', '%s (%s, system %s)' % (inspection.get('status', 'Not run'), self.stamp(inspection.get('at')), inspection.get('system', '-')))
            self.detail('Inspection details', inspection.get('detail', 'Use Inspect Live to check the current system.'))
        if position is not None:
            try:
                body.ScrollToVertical(position)
            except Exception:
                pass

    def make_test_callback(self, key):
        def callback(*args):
            self.run_validation_test(key)
        return callback


def open_window():
    if _allowed and _alive:
        NullsecUpgradesWindow.Open()


def available():
    return _allowed and _alive


registration = mods.register('nullsec-upgrades', {'en':'Nullsec Upgrades'}, open_window, api_version=1, is_available=available)


def authorize():
    global _allowed
    try:
        _allowed = _alive and bool(snapshot('menu').get('authorized'))
    except Exception:
        _allowed = False
    if _alive and _allowed:
        registration.update({'en':'Nullsec Upgrades'}, open_window, is_available=available)


uthread.new(authorize)


def cleanup():
    global _alive, _allowed
    _alive = False
    _allowed = False
    registration.close()
    NullsecUpgradesWindow.CloseIfOpen()
