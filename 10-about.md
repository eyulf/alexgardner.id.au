---
layout: page_stats
featured: true
title: About
description: I'm a Linux Systems Administrator based in Sydney.
permalink: /about/
published: true
image: /assets/images/titleimages/about.jpg

image_side:
  direction: left
  path: /assets/images/alex-gardner.jpg
  attribution:
    name: Anthea Wright
    link: "{{ site.data.links.main.anthea }}"

stats:
  - name: Years in IT
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }}+"
  - name: Years as a Sysadmin
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.sysadmin }}+"
---

{% include images.html %}

In mid 2014 I made a massive change to my life and moved interstate, away from my friends and family in Adelaide, to Sydney in order to further my career. Since then I have stepped up and moved from Technical Support to System Administration.

I have over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years of IT experience in general, and have worked in the Hosting and Telecommunication industries. I run a personal [homelab]({% link 20-homelab.md %}) which I use to learn new things about technology and practise the art of automating almost everything.

In my spare time I participate in [archery]({% link 30-reenactment.md %}) with the [Medieval Archery Society]({{ site.data.links.main.mas }}), and impose my will onto steel by [blacksmithing]({% link 40-blacksmithing.md %}).

My preferred method of contact is through [email](mailto:{{ site.email }}). I also have a [LinkedIn]({{ site.data.links.main.linkedin }}) page, but update it even less then this website.
