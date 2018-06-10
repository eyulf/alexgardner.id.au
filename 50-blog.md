---
layout: page
title: Blog
description: Updates to my blog are highly irregular.
permalink: /blog/
published: true
image: /assets/images/titleimages/blog.jpg
---

{% for post in site.posts %}

<section class="spotlight">
    <div class="image">{% if post.titleimage %}<img src="{{ "" | absolute_url }}/assets/images/titleimages/{{ post.titleimage }}" alt="" />{% endif %}</div>
    <div class="content">
        <h2><a href="{{ post.url | relative_url }}" class="link">{{ post.title }}</a></h2>
    </div>
</section>

{% endfor %}

