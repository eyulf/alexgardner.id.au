---
layout: post
title: "Basic internet security tips"
date: 2011-06-26 20:32 +1100
categories: [Basics, Guides, Security]
permalink: /blog/:title/
published: true
titleimage: security
---

With the current state of the Internet, it is important to be as secure as you can while browsing it. I have listed some tips for people who need to start learning the basics. This is by no means technical or exhaustive (I'm writing this for friends as well) and is aimed primarily at windows users.

I will start with the Router, this device stands between you and the Internet. It is therefore quite important to make sure it is as secure as possible. This isn't as important if you are connected through a Mobile Broadband 3g stick, but is still good to know. If you are connected to a public wireless network, make sure you read the section on VPNs.

* **Admin Password:** Chances are you haven't changed the default admin password, this is something that should be remedied as default passwords are quite [well known][router-passwords].
* **Firewall:** You should explore what options the router gives you for a firewall, they can be tricky to set up right but most routers should come with pre-defined settings. The best word of advice here is to experiment, if you break something try it differently, or search the internet for help.
* **Wireless:** If you don't need it, turn it off. Otherwise make sure you use WPA2, have a [decent][my-password-article] preshared key and use a non standard SSID.
* **RTFM:** Some routers come with more involved security options, read the manual and discover what they are.

Now that you've taken some reasonable measures to make the router more secure it's time to focus on the computers attached to it.

* **Anti-Virus:** This goes without saying, just be aware there are perfectly good free options out there such as [AVG][avg], [Avira][avira], or [Avast!][avast]. Additionally a good complementary program to have is MalwareBytes [AntiMalware][malware-bytes].
* **Firewall:** Make sure it is multi-directional, this means it inspects traffic going in and out. one good example is [Comodo][comodo]. Just a note on this as well, get used to popups asking if you you want traffic to be blocked or not, once trained this should be occasional, but it is worth putting up with if you get malware that gets exposed by these prompts.
* **Patch your Systems:** Keep everything up to date, good windows tools for this are Secunia's [PSI][secunia-psi], filehippo's [update checker][filehippo], and [ninite.com][ninite]. Also make sure you remove programs you no longer require, avoid using end of life software or programs known to be easy to exploit such as Shockwave, Adobe Reader, or Flash.
* **Be Normal:** Don't use the admin account if you don't need to. Also use protective features like User Account Control if you can.
* **Sandbox:** This is something that separates your browser from windows, if the browser is compromised, malware will have a more difficult time to escape into the system. Avast! and Comodo come with sandbox features, but you can also get standalone programs.
* **Host Based Intrusion Detection System:** This is a program that monitors network traffic and tells you if something on your computer is acting unusual or suspiciously, detecting malicious activity. Comodo includes one with Defence+, but as stated before get used to naggy popups until it learns what is normal for your system .

Next on the agenda is to start developing a security conscious mind. This is the most important aspect as you can apply this anywhere.

* **Encryption**: Whenever possible use encryption, it prevents your data from being intercepted and comes in various forms some of which I have listed below.
    * **HTTPS:** This is for normal internet traffic, good websites allow you to specify to use it exclusively, and you can force it by using various browser plugins; [HTTPS Everywhere][https-everywhere] for Firefox and [KB SSL Enforcer][ssl-enforcer] for Chrome.
    * **VPN:** You can use a VPN to encrypt your network traffic from your computer to the VPN server, this is good as anyone trying to intercept your traffic in between (such as a wireless hotspot) can only see the encrypted traffic. You need to shop around for a [good VPN provider][best-vpn-providers], and generally you get what you pay for.
* **Common Sense/Skepticism:** Use it, question everything. Learn to recognize [SPAM][wiki-spam], [Phishing attempts][wiki-phishing], and other forms of [Social Engineering][wiki-socialeng] attacks. Also don't store privileged information in random accounts, this can include storing financial information (such as credit cards or banking details) on online stores, sure it might make it convenient next time you shop, but that same convenience works both ways if your account is ever compromised either through social engineering or insecurity on the shop's part.

If you learnt something new from these tips then you have increased your level of security. But this is only the start, ignorance is certainly not an option if you are serious about your security online.

[router-passwords]:    https://www.routerpasswords.com/
[my-password-article]: {% link _posts/2010-11-10-how-to-easily-make-a-strong-password.md %}
[avg]:                 https://free.avg.com/
[avira]:               https://www.avira.com/free
[avast]:               https://www.avast.com/free-antivirus-download
[malware-bytes]:       https://www.malwarebytes.com/
[comodo]:              https://personalfirewall.comodo.com/free-download.html
[secunia-psi]:         https://secunia.com/vulnerability_scanning/personal/
[filehippo]:           http://www.filehippo.com/updatechecker/
[ninite]:              https://ninite.com/
[https-everywhere]:    https://www.eff.org/https-everywhere
[ssl-enforcer]:        https://chrome.google.com/webstore/detail/flcpelgcagfhfoegekianiofphddckof?hl=en-US
[best-vpn-providers]:  https://www.lifehacker.com.au/2011/02/five-best-vpn-service-providers/
[wiki-spam]:           https://en.wikipedia.org/wiki/Spam_(electronic)
[wiki-phishing]:       https://en.wikipedia.org/wiki/Phishing
[wiki-socialeng]:      https://en.wikipedia.org/wiki/Social_engineering_(security)
