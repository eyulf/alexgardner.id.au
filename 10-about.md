---
layout: page_stats
featured: true
title: About
description: "I am a Cloud Solutions Engineer with over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years experience in IT."
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
  - name: Years in Cloud
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.cloud }}+"
---

{% include images.html %}

Professionally, I have over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.it }} years of IT experience in general, and have worked in the Hosting and Telecommunication industries. I run a personal [homelab]({% link 20-homelab.md %}) which I use to practise and learn new things about technology.

In 2014 I made a massive change to my life and moved interstate, away from my family and friends in Adelaide, to Sydney in order to further my career. Since then I have worked as a Systems Administrator and then as a Systems Engineer.

In 2020 I started working professionally with cloud technology following my employer's business transformation and focus on providing Managed Cloud Services. I am now working as a Cloud Solutions Engineer.

Throughout my career I have obtained multiple technology certifications to validate my skills and knowledge from various vendors including Juniper, RedHat and Amazon. Currently I hold the [AWS CSAP]({{ site.data.links.certs.aws-sap }}) and [Terraform Associate]({{ site.data.links.certs.tf-associate }}) certifications.

Outside of my professional life, I have been a [historical re-enactor]({% link 30-reenactment.md %}) for over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.reenactment }} years. In my spare time I participate in archery with the [Medieval Archery Society]({{ site.data.links.main.mas }}), learn Historical European Martial Arts (HEMA) with [Stoccata]({{ site.data.links.main.stoccata }}), and dabble in [blacksmithing]({% link 40-blacksmithing.md %}) with a historical focus.

My preferred method of contact is through [email](mailto:{{ site.email }}). I also have a [LinkedIn]({{ site.data.links.main.linkedin }}) page detailing my professional career.
