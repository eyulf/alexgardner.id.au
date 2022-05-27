---
layout: post
title: "AWS Certified DevOps Engineer - Professional"
date: 2022-03-30 10:00 +1100
permalink: /blog/:title/
comments: true
categories: [AWS Cloud Certification]
titleimage: aws-dop
---

{% include blog_image.html image="aws-dop" format="png" alt="AWS Certified DevOps Engineer - Professional" %}

On {{ page.date | date_to_long_string }}, I passed the [AWS Certified DevOps Engineer - Professional (DOP-C01)][aws-dop-exam] exam, and am now an [AWS Certified DevOps Engineer - Professional][aws-dop-cert].

My primary study material for this was fragmented, as late last year I completed both the [Developer - Associate][cantrill-dva-course] and [SysOps Administrator - Associate][cantrill-soa-course] courses by [Adrian Cantrill][cantrill]. However, at the time I was looking at taking the exam, Adrian did not have any specific course for the Professional level Exam. I would have preferred to wait for the course to be available and to have had both associate certificates under my belt, but was challenged and incentivized by work to hasten my time-frame for this.

In the first practice exam I took, I got around 78%, and then averaged around 71% for subsequent tests. I did find that the practice exams were slightly harder then the actual exam itself. I also found the DOP-C01 exam easier then [SAP-C01][aws-sap] exam I took at the end of 2020. In order to fill in gaps identified by the practice exams, I opted to go through [Udemy][udemy] based training courses. The specific study resources used were:

* Practical experience through working professionally with AWS
* Adrian Cantrill's [Developer - Associate training course][cantrill-dva-course]
* Adrian Cantrill's [SysOps Administrator - Associate training course][cantrill-soa-course]
* Stephane Maarek's [DevOps Engineer Professional training course][udemy-stephane-maarek]
* Zeal Vora's [DevOps Engineer Professional training course][udemy-zeal-vora]
* [Practice Exams][tutorialsdojo-dop] by Tutorials Dojo
* [Study Guide eBook][tutorialsdojo-dop-guide] by Tutorials Dojo

The exam experience itself did not quite match the experience provided by the practice exams as I answered all 70 questions in approximately 100 minutes, and took advantage of the time left to thoroughly review my answers. I ended up finishing the exam with about 30 minutes left on the clock and unlike the SAP-C01 exam did not think that I would outright fail the exam.

[aws-dop-exam]:            https://aws.amazon.com/certification/certified-devops-engineer-professional/
[aws-dop-cert]:            {{ site.data.links.certs.aws-dop }}
[cantrill]:                https://learn.cantrill.io/
[cantrill-dva-course]:     https://learn.cantrill.io/p/aws-certified-developer-associate
[cantrill-soa-course]:     https://learn.cantrill.io/p/aws-certified-sysops-administrator-associate
[tutorialsdojo]:           https://tutorialsdojo.com/
[tutorialsdojo-dop]:       https://portal.tutorialsdojo.com/courses/aws-certified-devops-engineer-professional-practice-exams/
[tutorialsdojo-dop-guide]: https://portal.tutorialsdojo.com/product/tutorials-dojo-study-guide-ebook-aws-certified-devops-engineer-professional/
[aws-sap]:                 {% link _posts/2020-12-11-aws-certified-systems-architect-professional.md %}
[udemy]:                   https://www.udemy.com/
[udemy-stephane-maarek]:   https://www.udemy.com/course/aws-certified-devops-engineer-professional-hands-on
[udemy-zeal-vora]:         https://www.udemy.com/course/master-aws-certified-devops-engineer-professional
