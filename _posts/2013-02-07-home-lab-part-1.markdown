---
layout: post
title: "Home-Lab Part 1"
date: 2013-02-07 04:39
comments: true
permalink: /blog/:title/
categories: [Homelab, Networking]
---

Something I've been working on for the past year or so is getting a home-lab setup for playing around with stuff. This is the first post on what will hopefully become a semi regular update. This is currently what it looks like.

<img class="post-img" src="/images/blog/lab1.jpg" title="My current Home-Lab" alt="My current Home-Lab">

Specs are as follows.

<ul>
<li>Whitebox Proxmox VE server
<ul><li>AMD Phenom 9850 Quad-core</li>
<li>4 GB RAM</li>
<li>1 TB HDD</li></ul>
</li>

<li>Qnap TS-410 NAS
<ul><li>4x 2 TB HDD in RAID 5</li></ul>
</li>

<li>HP Proliant N36L Microserver
<ul><li>8GB RAM</li>
<li>1 TB HDD</li></ul>
</li>

<li>Mikrotik RB2011UAS Router</li>

<li>TPlink TL-SG3216 switch</li>

<li>Billion 7800N Modem/Router
<ul><li>Currently used as a Wireless access point</li></ul>
</li>
</ul>

Currently I am using the Proxmox whitebox as my main VM environment. I currently use it to run various network services including, but not limited to, DNS, DHCP, Monitoring, Log collection, Ticketing and Website development. I am planning on adding another VM server in at some point and build a Windows based lab environment (the current linux based systems will remain as my core network services).

The Microserver is currently empty awaiting some time for me to repurpose it, I'll probably end up putting Security Onion onto it. I am considering creating a whitebox NAS to replace my current QNAP, 4 disks is not enough and I'd prefer something I can rackmount.
