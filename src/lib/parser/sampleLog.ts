/**
 * A realistic 40-line sample EVE combat log excerpt covering every event type.
 * Used for development, demos, and testing.
 */
export const SAMPLE_LOG = `------------------------------------------------------------
  Gamelog
  Listener: TestPilot Okainen
  Session Started: 2025.10.23 02:08:00
------------------------------------------------------------

[ 2025.10.23 02:08:05 ] (combat) <color=0xff00ffff><b>367</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Hits
[ 2025.10.23 02:08:10 ] (combat) <color=0xff00ffff><b>512</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Penetrates
[ 2025.10.23 02:08:15 ] (combat) <color=0xff00ffff><b>230</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Rina Osk[TEST](Brutix Navy Issue)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Grazes
[ 2025.10.23 02:08:20 ] (combat) <color=0xff00ffff><b>88</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Rina Osk[TEST](Brutix Navy Issue)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Glances Off
[ 2025.10.23 02:08:25 ] (combat) <color=0xff00ffff><b>991</b> <color=0x77ffffff><font size=10>to</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Heavy Entropic Disintegrator II - Smashes
[ 2025.10.23 02:08:39 ] (combat) <color=0xffcc0000><b>1021</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Kasa Habalu[TGRAD](Typhoon)</b><font size=10><color=0x77ffffff> - Caldari Navy Mjolnir Heavy Missile - Hits
[ 2025.10.23 02:08:44 ] (combat) <color=0xffcc0000><b>847</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Rina Osk[TEST](Brutix Navy Issue)</b><font size=10><color=0x77ffffff> - Neutron Blaster Cannon II - Penetrates
[ 2026.02.19 05:33:16 ] (combat) <color=0xffcc0000><b>18</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Thug</b><font size=10><color=0x77ffffff> - Nova Light Missile - Hits
[ 2026.02.19 05:33:20 ] (combat) <color=0xffcc0000><b>42</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Ruffian</b><font size=10><color=0x77ffffff> - Mjolnir Light Missile - Glances Off
[ 2026.02.19 05:33:22 ] (combat) <color=0xffcc0000><b>6</b> <color=0x77ffffff><font size=10>from</font> <b><color=0xffffffff>Arch Gistii Rogue</b><font size=10><color=0x77ffffff> - Glances Off
[ 2026.02.19 05:33:13 ] (combat) Arch Gistii Thug misses you completely
[ 2025.10.23 02:08:48 ] (combat) <color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>
[ 2025.10.23 02:09:00 ] (combat) <color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>
[ 2025.10.23 02:09:12 ] (combat) <color=0xffccff66><b>120</b><color=0x77ffffff><font size=10> remote armor repaired by </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Medium Armor Maintenance Bot I</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Armor Maintenance Bot I</font>
[ 2025.10.23 02:09:24 ] (combat) <color=0xffccff66><b>256</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>
[ 2025.10.23 02:09:36 ] (combat) <color=0xffccff66><b>192</b><color=0x77ffffff><font size=10> remote armor repaired to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Vedmak</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Remote Armor Repairer II</font>
[ 2025.10.23 02:08:37 ] (combat) <color=0xffe57f7f><b>438 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Typhoon</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Heavy Energy Neutralizer II</font>
[ 2025.10.23 02:11:40 ] (combat) <color=0xff7fffff><b>165 GJ</b><color=0x77ffffff><font size=10> energy neutralized </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Proteus</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Infectious Scoped Energy Neutralizer</font>
[ 2025.10.23 02:10:23 ] (combat) <color=0xffe57f7f><b>-0 GJ</b><color=0x77ffffff><font size=10> energy drained to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Brutix Navy Issue</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Energy Nosferatu II</font>
[ 2025.10.23 02:10:35 ] (combat) <color=0xffe57f7f><b>-7 GJ</b><color=0x77ffffff><font size=10> energy drained to </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Typhoon</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Medium Energy Nosferatu II</font>
[ 2025.10.23 02:10:48 ] (combat) <color=0xff7fffff><b>+12 GJ</b><color=0x77ffffff><font size=10> energy drained from </font><b><color=0xffffffff><fontsize=12><color=0xFFFFFF00><b> <u>Brutix Navy Issue</u></b></color></fontsize></b></fontsize></b><color=0x77ffffff><font size=10> - Heavy Energy Nosferatu II</font>
`
