---
layout: post
title: "Home-Lab Part 2"
date: 2014-03-13 20:39 +1100
permalink: /blog/:title/
comments: true
categories: [Homelab]
titleimage: homelab2
---

It's been a while since I've done an update on my HomeLab, and there have been changes. I've started migrating my OpenVZ containers over to CentOS, as this is something I need more experience in. I've also stopped using the Whitebox due to hardware issues, and have instead turned the microserver into the main VM host. This is the current setup.

{% include blog_image.html image="lab2-rack" format="jpg" alt="My current Home-Lab Rack" %}

The labels in the above picture are wrong as I've overhauled my internal domain. A recent addition is the UPS I purchased shortly after the last homelab post. Currently, my lab is using ~90 watts of power (~2.16 kWh/day). I've also made up a quick network map which is below.

{% include blog_image.html image="lab2-map" format="jpg" alt="My current Home-Lab Network" %}
