---
layout: page
title: Blog
description: Updates to my blog are highly irregular.
permalink: /blog/
published: true
image: /assets/images/titleimages/blog.jpg
pagination: 
  enabled: true
---

{% for post in paginator.posts %}

<section class="spotlight">
    <div class="image">{% if post.titleimage %}<img src="{{ "" | absolute_url }}/assets/images/titleimages/{{ post.titleimage }}" alt="" />{% endif %}</div>
    <div class="content">
        <h2><a href="{{ post.url | relative_url }}" class="link">{{ post.title }}</a></h2>
    </div>
</section>

{% endfor %}


{% if paginator.total_pages > 1 %}
<section class="spotlight">
    <div class="blogpaginate">
        <ul class="actions">
        {% if paginator.previous_page %}
            <li>
                <a class="button special" href="{{ paginator.previous_page_path | prepend: site.baseurl }}">Newer</a>
            </li>
        {% endif %}
        {% if paginator.next_page %}
            <li>
                <a class="button special" href="{{ paginator.next_page_path | prepend: site.baseurl }}">Older</a>
            </li>
        {% endif %}
        </ul>
    </div>
</section>
{% endif %}
