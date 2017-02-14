---
layout: post
title: "Resetting a forgotten PIN for Android"
date: 2013-09-23 20:39
comments: true
permalink: /blog/:title/
categories: [Android, Guides, Password, Hacking]
---

So I recently got a new phone which I promptly re-flashed with CyagenMod. All was well until I set a PIN on it at work. Once at home I attempted to unlock the phone and found what I thought to be the PIN not working. This was quite a pain as I did not want to Factory Reset the phone.

Annoyed I hit the net, finding a <a rel="nofollow" href="http://forum.xda-developers.com/showthread.php?t=1409304" target="_blank">few</a> <a rel="nofollow" href="http://forensics.spreitzenbarth.de/2012/02/28/cracking-pin-and-password-locks-on-android/" target="_blank">guides</a> for what appears to be older iterations of CyagenMod. The main issue with what I had found and what I had in front of me is that the '*secure*' Table found in this DB,
*/data/data/com.android.providers.settings/databases/settings.db* looked like this...

```
2|wifi_watchdog_watch_list|GoogleGuest
3|mock_location|0
4|backup_enabled|0
5|backup_transport|com.google.android.backup/.BackupTransportService
6|mount_play_not_snd|1
7|mount_ums_autostart|0
8|mount_ums_prompt|1
9|mount_ums_notify_enabled|1
10|accessibility_script_injection|0
11|accessibility_web_content_key_bindings|0x13=0x01000100; 0x14=0x01010100; 0x15=0x02000001; 0x16=0x02010001; 0x200000013=0x02000601; 0x200000014=0x02010601; 0x200000015=0x03020101; 0x200000016=0x03010201; 0x200000023=0x02000301; 0x200000024=0x02010301; 0x200000037=0x03070201; 0x200000038=0x03000701:0x03010701:0x03020701;
12|long_press_timeout|500
13|touch_exploration_enabled|0
14|speak_password|0
15|accessibility_script_injection_url|https://ssl.gstatic.com/accessibility/javascript/android/AndroidVox_v1.js
16|lockscreen.disabled|0
17|screensaver_enabled|1
21|screensaver_default_component|com.google.android.deskclock/com.android.deskclock.Screensaver
22|accessibility_display_magnification_enabled|0
23|accessibility_display_magnification_scale|2.0
24|accessibility_display_magnification_auto_update|1
26|android_id|...
27|enabled_input_methods|com.android.inputmethod.latin/.LatinIME
29|selected_input_method_subtype|-1
30|selected_spell_checker|com.android.inputmethod.latin/.spellcheck.AndroidSpellCheckerService
31|selected_spell_checker_subtype|0
32|adb_port|-1
33|default_input_method|com.android.inputmethod.latin/.LatinIME
34|user_setup_complete|1
35|input_methods_subtype_history|com.android.inputmethod.latin/.LatinIME;-921088104
36|bluetooth_name|GT-I9300
37|bluetooth_address|4C:BC:A5:B7:4A:B5
38|bluetooth_addr_valid|1
39|lock_screen_owner_info|This device is monitored
40|location_providers_allowed|
42|screensaver_activate_on_sleep|1
43|screensaver_activate_on_dock|1
44|screensaver_components|com.android.dreams.basic/com.android.dreams.basic.Colors
45|lock_screen_appwidget_ids|5
```

Instead of this which the guides wanted. (lockscreen.password_type was missing)

<img class="post-img" src="/images/blog/expected-pin-db.jpg">

Attempting to fix this from another angle I then went looking for the password hash, if I couldn't set the lockscreen to slide unlock, I could at least try to bruteforce the PIN. I located the hash in /data/system/password.key. While looking for it I noticed something else...

```
~ # ls /data/system
batterystats.bin      inputmethod           profiles.xml
cache                 locksettings.db       registered_services
called_pre_boots.dat  locksettings.db-shm   shared_prefs
cm_gesture.key        locksettings.db-wal   sync
device_policies.xml   netpolicy.xml         throttle
dropbox               netstats              uiderrors.txt
entropy.dat           packages.list         usagestats
gesture.key           packages.xml          users
hdcp2                 password.key
```

'locksettings.db' hmm, wonder whats in here. 

```
sqlite> select * from locksettings;
2|migrated|0|true
6|lockscreen.disabled|0|0
7|lockscreen.password_salt|0|...
13|lock_pattern_autolock|0|0
15|lockscreen.password_type_alternate|0|0
16|lockscreen.password_type|0|131072
17|lockscreen.passwordhistory|0|
```

Sure enough I had found what I was looking for initially (and also the salt in case I really did want to bruteforce the PIN). So just update what I need and verify change.

```
sqlite> update locksettings set value=65536 where name='lockscreen.password_type';
sqlite> select * from locksettings;
2|migrated|0|true
6|lockscreen.disabled|0|0
7|lockscreen.password_salt|0|...
13|lock_pattern_autolock|0|0
15|lockscreen.password_type_alternate|0|0
16|lockscreen.password_type|0|65536
17|lockscreen.passwordhistory|0|
```

Reboot the phone and bam, slide unlock! 

## TL;DR

1. Place Android based phone into debug mode (<a rel="nofollow" href="http://forum.xda-developers.com/wiki/ClockworkMod_Recovery" target="_blank">CWM</a> helps)
2. Mount /system at least
3. Plug into computer running adb
4. Run following commands

```
adb shell
sqlite3 /data/system/locksettings.db 
update locksettings set value=65536 where name='lockscreen.password_type';
.exit
exit
adb reboot
```

Result: Slide-lock 'protected' phone

Obligatory disclaimers: Don't use this on any device you don't have explicit authorization to do this on. Also this has only been tested with CyagenMod 10.1 on a Samsung Galaxy S3
