---
layout: page_stats
featured: true
title: Blacksmithing
description: In my spare time I also engage my creativity onto steel.
permalink: /blacksmith/
published: true
image: /titleimages/blacksmithing

image_row:
  - title: Forged Heart
    name: heart
  - title: My Forge and Workshop
    name: workshop
  - title: Mokume Gane attempt 2 (It failed)
    name: mokume-attempt
  - title: Fire Poker and Clothes Hook
    name: poker
  - title: Various Tools needed to make Rounding Hammer
    name: tools
  - title: Rounding Hammer
    name: hammer

stats:
  - name: Years Blacksmithing
    value: "{{ site.time | date: '%Y' | minus: site.data.misc.year_started.blacksmithing }}+"
  - name: Items Forged
    value: "{% assign forgeditems = 0 %}{% for item in site.data.forged %}{% assign forgeditems = forgeditems | plus: item[1] %}{% endfor %}{{ forgeditems }}+"
---

During my time [re-enacting]({% link 30-reenactment.md %}), I found both the need and the spark for blacksmithing. Eventually over time, this passion grew to the point that I took a couple of professional classes. I am aiming to becoming self sufficient, and intend on making the majority of the tools I use.

Blacksmithing is a hobby for me, and I do not see myself doing this full time Part of the enjoyment I find in this comes from the satisfaction of creating things, and seeing them transform from raw material into the desired item.

Currently my primary forge is gas powered, and I own a couple of 20kg Anvils. I have been working on establishing a mobile, historically accurate forge complete with tools and accessories.

{% include images.html %}
