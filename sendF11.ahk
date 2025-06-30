#Requires AutoHotkey v2.0

; Wait for Edge window to appear, then send F11 key
WinWaitActive("ahk_exe msedge.exe")
Sleep(1000)  ; wait a bit to ensure page loaded
Send("{F11}")
