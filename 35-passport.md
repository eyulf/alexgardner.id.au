---
layout: page
featured: false
parent: /reenactment/
title: Re-enactment - Passport
description: "I have been a medieval re-enactor for over {{ site.time | date: '%Y' | minus: site.data.misc.year_started.reenactment }} years."
permalink: /reenactment/passport/
published: true

archer:
  - type: Head
    items:
      - name: Archer's Cap
      - name: Hood
      - name: Coif
  - type: Torso
    items:
      - name: Under Shirt
        link: 14c-archer-undershirt
      - name: Tunic
      - name: Belt
  - type: Legs
    items:
      - name: Braies
      - name: Hose
        link: 14c-archer-hose
      - name: Boots
  - type: Weapons
    items:
      - name: Bows
      - name: Arrows
      - name: Arrow Bag
      - name: Dagger
      - name: Sword
  - type: Accessories
    items:
      - name: Pouch
      - name: Pilgrim's Bag
      - name: Bowl
      - name: Mug
      - name: Cutlery
  - type: Camping
    items:
      - name: Tent
      - name: Bedding
      - name: Bench
      - name: Chest
        link: 14c-archer-chest
---

This is my [re-enactment]({% link 30-reenactment.md %}) "passport", essentially it is the categorisation and documentation of the kit/garb (costume and equipment) that I wear and use at re-enactment events. This will be a "living" document, and updates will be made to it as I obtain more kit, or learn new sources. I first came across this concept through a post I saw online which I can no longer locate.

There are several benefits from doing this, which include identifying gaps in my historical portrayal, as well as being able to prioritise buying/making/repairing what I need compared to what I want. It also forces me to perform more research into my portrayal, as part of this passport is providing sources for each item.

While the [Medieval Archery Society]({{ site.data.links.main.mas }}) does not have stringent historical accuracy requirements, there are other groups that do, and a passport helps with meeting their requirements. Narrowing down the time period and location of a historical portrayal also helps improve the overall accuracy of the portrayal.

This is currently in the process of being filled out with what I currently have and is not complete in any sense of the word.

<section>
    <h2>14th Century English Archer</h2>
    <span class="image left">
        <p><picture>
                <source srcset="/assets/images/reenactment/passport/archer/14c-english-archer.webp" type="image/webp">
                <img src="/assets/images/reenactment/passport/archer/14c-english-archer.jpg" alt="14th Century English Archer">
        </picture></p>

        An English Peasant Archer, serving in an English Free Company operating in France around 1365.

    </span>

    <div class="table-wrapper">
        <table class="table">
            {% for type in page.archer %}
            <tr>
                <th><h4>{{ type.type }}</h4></th>
                <td>
                    <ul>
                        {% for item in type.items %}
                        {% if item.link %}
                        <li><a href="{% link passport/{{ item.link }}.md %}">{{ item.name }}</a></li>
                        {% else %}
                        <li>{{ item.name }}</li>
                        {% endif %}
                        {% endfor %}
                    </ul>
                </td>
            </tr>
            {% endfor %}
        </table>
    </div>
</section>
