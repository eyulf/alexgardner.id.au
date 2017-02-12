---
layout: page
title: Blog
weight: 40
permalink: /blog/
---

  <h1 class="blog-heading">Blog Articles</h1>

  <ul class="post-list">
    {% for post in site.posts %}
      <li>
        <h2>
          <a class="post-link" href="{{ post.url | prepend: site.baseurl }}">{{ post.title }}</a>
        </h2>
      </li>
    {% endfor %}
  </ul>
