---
layout: page_stats
featured: true
title: About
description: "I'm a Linux Sysadmin with over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years experience, based in Sydney."
permalink: /about/
published: true
image: titleimages/about

image_side:
  direction: left
  path: alex-gardner
  alt: Alex Gardner
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

I have over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years of IT experience in general, and have worked in the Hosting and Telecommunication industries. I run a personal [homelab]({% link 20-homelab.md %}) which I use to practise and learn new things about technology and the art of automating almost everything.

In mid 2014 I made a massive change to my life and moved interstate, away from my existing friends and family in Adelaide, to Sydney in order to further my career. Since then I have been promoted a couple of time and am now performing the technical implementation and engineering of new products for the hosting company I work for.

I have been a [historical re-enactor]({% link 30-reenactment.md %}) for over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.reenactment }} years. In my spare time I participate in archery with the [Medieval Archery Society]({{ site.data.links.main.mas }}), and engage my creative spark onto steel by [blacksmithing]({% link 40-blacksmithing.md %}).

My preferred method of contact is through [email](mailto:{{ site.email }}). I also have a [LinkedIn]({{ site.data.links.main.linkedin }}) page, but update it even less then this website.
