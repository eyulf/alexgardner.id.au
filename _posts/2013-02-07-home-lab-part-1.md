---
layout: post
title: "Home-Lab Part 1"
date: 2013-02-07 04:39 +1100
comments: true
permalink: /blog/:title/
categories: [Homelab]
titleimage: homelab1
---

Something I've been working on for the past year or so is getting a home-lab setup for playing around with stuff. This is the first post on what will hopefully become a semi-regular update. This is currently what it looks like.

{% include blog_image.html image="lab1" format="jpg" alt="My current Home-Lab" %}

Specs are as follows.

* Whitebox Proxmox VE server
    * AMD Phenom 9850 Quad-core
    * 4 GB RAM
    * 1 TB HDD

* Qnap TS-410 NAS
    * 4x 2 TB HDD in RAID 5

* HP Proliant N36L Microserver
    * 8GB RAM
    * 1 TB HDD

* Mikrotik RB2011UAS Router

* TPlink TL-SG3216 switch

* Billion 7800N Modem/Router
    * Currently used as a Wireless access point

Currently, I am using the Proxmox white box as my main VM environment. I currently use it to run various network services including, but not limited to, DNS, DHCP, Monitoring, Log collection, Ticketing and Website development. I am planning on adding another VM server at some point and building a Windows-based lab environment (the current Linux based systems will remain as my core network services).

The Microserver is currently empty awaiting some time for me to re-purpose it, I'll probably end up putting Security Onion onto it. I am considering creating a white box NAS to replace my current QNAP, 4 disks is not enough and I'd prefer something I can rackmount.
