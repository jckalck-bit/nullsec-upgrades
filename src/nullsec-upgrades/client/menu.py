# -*- coding: utf-8 -*-
import json
import blue
import uthread
import evejs_mod_menu as mods
from carbonui import uiconst
from carbonui.control.window import Window
from eve.client.script.ui.control.eveLabel import EveLabelMedium

_allowed = False
_alive = True

def snapshot():
    return json.loads(sm.RemoteSvc('slash').SlashCmd('/nullsecindexsnapshot'))

class IndustrialDebug(Window):
    default_windowID = 'NullsecIndustrialDebugV1'
    default_caption = 'Industrial Index Debug'
    default_width = 380
    default_height = 260
    default_scope = uiconst.SCOPE_INGAME

    def ApplyAttributes(self, attributes):
        Window.ApplyAttributes(self, attributes)
        self.status = EveLabelMedium(parent=self.content, align=uiconst.TOTOP, text='Waiting for server...')
        uthread.new(self.refresh)

    def refresh(self):
        while _alive and not self.destroyed:
            system = session.solarsystemid2
            try:
                d = snapshot()
                if self.destroyed or not _alive:
                    return
                if system != session.solarsystemid2 or not d.get('available') or d.get('id') != system:
                    self.status.text = 'Unavailable'
                else:
                    self.status.text = ('System: %s<br>Next settlement: %ss<br>Mined this cycle: %.2f m3<br>Multiplier: %.2fx<br>Current index: %.4f levels<br>Pending: +%.4f levels<br>Projected: %.4f levels' % (system,d['remaining'],d['volume'],d['multiplier'],d['current']/100.0,d['pending']/100.0,d['projected']/100.0))
            except Exception:
                if not self.destroyed:
                    self.status.text = 'Unavailable'
            blue.pyos.synchro.SleepWallclock(1000)

def open_window():
    if _allowed:
        IndustrialDebug.Open()

def available():
    return _allowed and _alive

registration = mods.register('nullsec-upgrades', {'en':'Industrial Index Debug'}, open_window, api_version=1, is_available=available)

def authorize():
    global _allowed
    try:
        _allowed = _alive and bool(snapshot().get('authorized'))
    except Exception:
        _allowed = False
    if _alive and _allowed:
        registration.update({'en':'Industrial Index Debug'}, open_window)

uthread.new(authorize)

def cleanup():
    global _alive, _allowed
    _alive = False
    _allowed = False
    registration.close()
    IndustrialDebug.CloseIfOpen()
