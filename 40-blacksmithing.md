---
layout: page_stats
featured: true
title: Blacksmithing
description: In my spare time I also impose my will onto steel.
permalink: /blacksmith/
published: true
image: /assets/images/titleimages/blacksmithing.jpg

image_row:
  - title: Fire Poker and Clothes Hook
    name: poker.jpg
  - title: Various Tools
    name: tools.jpg
  - title: Rounding Hammer
    name: hammer.jpg

stats:
  - name: Years Blacksmithing
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.blacksmithing }}+"
  - name: Items Forged
    value: "{% assign forgeditems = 0 %}{% for item in site.data.forged %}{% assign forgeditems = forgeditems | plus: item[1] %}{% endfor %}{{ forgeditems }}+"
---

During my time [re-enacting]({% link 30-reenactment.md %}), I found both the need and the spark for blacksmithing. Eventually over time, this passion grew to the point that I took a couple of professional classes. I am slowly becoming self sufficient, and intend on making the tools I use.

Blacksmithing is a hobby for me, and I do not see myself doing this full time. Part of the enjoyment I find in this comes from the satisfaction of creating things, and seeing them transform from raw material into the desired item.

Currently my primary forge is gas powered, and I own a couple of 20kg Anvils. I am working on establishing a mobile, historically accurate forge complete with tools and accessories.

{% include images.html %}
