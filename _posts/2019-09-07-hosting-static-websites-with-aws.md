---
layout: post
title: "Hosting static websites with AWS"
date: 2019-09-07 16:00 +1100
permalink: /blog/:title/
comments: true
categories: [Website AWS Terraform]
titleimage: website-aws
---

I've recently made another significant change to this website, which is also not as visible as my previous [changes to the workflow][workflow]. The hosting has been moved from a self-managed VPS to AWS, using Terraform for setup and Gitlab for CI.

To update from my workflow post, for the Continuous Integration (CI), I am using [Gitlab CI][gitlab-ci] instead of [Buildbot][buildbot]. This move was fairly simple, as I’m now using Gitlab for my git server needs, and am slowly moving away from my Self Managed instance to their SaaS offering for ease of use. The CI included in Gitlab (SaaS or Self Managed) is a lot easier to use, being defined entirely in yaml, I’ll get to the setup of this further in this post.

The AWS hosting is a fairly standard setup for static websites, the files are on S3 buckets and I am using Cloudfront for both the domain and SSL, which is also provided by AWS. I decided that this would be a good chance to learn Terraform a bit deeper, and have provisioned the whole thing using Terraform. Both using AWS for static website hosting, and configuring it using Terraform has been documented quite a bit online, my own take on the Terraform configuration is below.

My Terraform configuration's file structure looks something like this.

```
.
├── modules
│   └── services
│       ├── gitlab-repo
│       │   ├── main.tf
│       │   └── variables.tf
│       └── website
│           └── static-website-aws-cloudflare
│               ├── main.tf
│               ├── outputs.tf
│               └── variables.tf
├── README.md
└── websites
    └── alexgardner.id.au
        └── main.tf

7 directories, 7 files
```

Each website I use this for will have its own configuration and state file, using the modules to do the heavy lifting. Cloudflare provides the DNS as I was already using this, and Terraform also configures a Gitlab repository, with variables for the CI.

## AWS Terraform Configuration

The `static_website_aws_cloudflare` module does the AWS and Cloudflare configuration. It gets the primary domain name, and an IAM group as variables. Then it creates the resources and outputs API details for the IAM user.

#### Variables & Outputs
```
variable "domain" {
  description = "The domain to use"
  type        = string
}

variable "user_group" {
  description = "The IAM group to add the S3 Uploader user"
  default     = "s3_Uploaders"
  type        = string
}
```
```
output "iam_user_access_key_id" {
  description = "The Access Key ID of the IAM user used for uploading to the S3 bucket"
  value       = aws_iam_access_key.default.id
  sensitive   = true
}

output "iam_user_secret_access_key" {
  description = "The Secret Access Key of the IAM user used for uploading to the S3 bucket"
  value       = aws_iam_access_key.default.secret
  sensitive   = true
}
```

The module itself starts with some housekeeping, defining the minimum Terraform version, local variables and other auxiliary requirements.

```
terraform {
  required_version = ">= 0.12"
}

locals {
  origin_id = "S3-${var.domain}"

  tags = {
    role   = "website"
    domain = var.domain
  }
}

provider "aws" {
  alias = "virginia"
  region = "us-east-1"
}
```

#### IAM User

The module starts its configuration by setting up an IAM user that only has access to the S3 bucket made by the module, this user is later used by the Gitlab CI to upload the website files.

```
data "aws_iam_policy_document" "user" {
  statement {
    actions = [
      "s3:*",
    ]

    resources = [
      "${aws_s3_bucket.default.arn}",
      "${aws_s3_bucket.default.arn}/*",
    ]
  }
}

resource "aws_iam_group" "default" {
  name = var.user_group
}

resource "aws_iam_user" "default" {
  name = "s3_uploader_${var.domain}"
  path = "/websites/"
  tags = local.tags
}

resource "aws_iam_user_group_membership" "default" {
  user = aws_iam_user.default.name

  groups = [
    aws_iam_group.default.name,
  ]
}

resource "aws_iam_access_key" "default" {
  user = aws_iam_user.default.name
}

resource "aws_iam_user_policy" "default" {
  name   = "s3_uploader_${var.domain}"
  user   = aws_iam_user.default.name
  policy = data.aws_iam_policy_document.user.json
}
```

#### S3 Buckets

The module then sets up S3 Buckets, for both the root domain and a www variant used for redirects. Website hosting is enabled on both, with www redirecting to the root domain. These buckets are set to Public visibility. An additional private bucket is created for logs to be sent to.

```
data "aws_iam_policy_document" "website" {
  statement {
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.default.arn}/*"]

    principals {
      type = "*"
      identifiers = ["*"]
    }
  }

  statement {
    actions = ["s3:ListBucket"]
    resources = [aws_s3_bucket.default.arn]

    principals {
      type = "*"
      identifiers = ["*"]
    }
  }
}

data "aws_iam_policy_document" "website_redirect" {
  statement {
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.default_redirect.arn}/*"]

    principals {
      type = "*"
      identifiers = ["*"]
    }
  }

  statement {
    actions = ["s3:ListBucket"]
    resources = [aws_s3_bucket.default_redirect.arn]

    principals {
      type = "*"
      identifiers = ["*"]
    }
  }
}

resource "aws_s3_bucket" "default" {
  bucket = var.domain
  acl    = "public-read"
  tags   = local.tags

  website {
    index_document = "index.html"
  }

  versioning {
    enabled = true
  }

  logging {
    target_bucket = aws_s3_bucket.default_logs.id
  }
}

resource "aws_s3_bucket_policy" "default" {
  bucket = aws_s3_bucket.default.id
  policy = data.aws_iam_policy_document.website.json
}

resource "aws_s3_bucket" "default_redirect" {
  bucket = "www.${var.domain}"
  acl    = "public-read"
  tags   = local.tags

  website {
    redirect_all_requests_to = "https://${var.domain}"
  }
}

resource "aws_s3_bucket_policy" "default_redirect" {
  bucket = aws_s3_bucket.default_redirect.id
  policy = data.aws_iam_policy_document.website_redirect.json
}

resource "aws_s3_bucket" "default_logs" {
  bucket = "${var.domain}-logs"
  acl    = "log-delivery-write"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "default_logs" {
  bucket = aws_s3_bucket.default_logs.id

  block_public_acls   = true
  block_public_policy = true
}
```

#### SSL Certificate

SSL certificates are created for both domain names using ACM, with Cloudflare records created to verify the domains. Using `create_before_destroy` is important here, as it prevents hard failures generated by ACM trying to destroy certificates in use if you re-run the Terraform configuration with an established state file. Also, note that the configuration here will generate a new SSL certificate every time it is run.

```
resource "aws_acm_certificate" "default" {
  provider = "aws.virginia"
  domain_name = var.domain
  subject_alternative_names = [
    var.domain,
    "www.${var.domain}"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "cloudflare_record" "cloudfront_validation_root" {
  domain  = var.domain
  name    = "${replace(aws_acm_certificate.default.domain_validation_options.0.resource_record_name, ".${var.domain}.", "")}"
  value   = "${replace(aws_acm_certificate.default.domain_validation_options.0.resource_record_value, "/\\.$/", "")}"
  type    = aws_acm_certificate.default.domain_validation_options.0.resource_record_type
  ttl     = 120
}

resource "cloudflare_record" "cloudfront_validation_redirect" {
  domain  = var.domain
  name    = "${replace(aws_acm_certificate.default.domain_validation_options.1.resource_record_name, ".${var.domain}.", "")}"
  value   = "${replace(aws_acm_certificate.default.domain_validation_options.1.resource_record_value, "/\\.$/", "")}"
  type    = aws_acm_certificate.default.domain_validation_options.1.resource_record_type
  ttl     = 120
}

resource "aws_acm_certificate_validation" "default" {
  provider = "aws.virginia"
  certificate_arn = aws_acm_certificate.default.arn
  validation_record_fqdns = [
    cloudflare_record.cloudfront_validation_root.hostname,
    cloudflare_record.cloudfront_validation_redirect.hostname
  ]
}
```

#### Cloudfront

Cloudfront is then set up for both domains, using the SSL certificate created earlier. This is the bulk of the configuration as there are slight differences in what it needs to do for each domain.

```
resource "aws_cloudfront_distribution" "default" {
  origin {
    domain_name = aws_s3_bucket.default.website_endpoint
    origin_id = local.origin_id

    custom_origin_config {
      http_port = 80
      https_port = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols = ["TLSv1.2"]
    }
  }

  aliases = [var.domain]

  enabled = true
  is_ipv6_enabled = true
  default_root_object = "index.html"

  logging_config {
    bucket = aws_s3_bucket.default_logs.bucket_domain_name
    include_cookies = false
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "allow-all"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.default.certificate_arn
    ssl_support_method = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

Cloudfront configuration for the redirect domain.

```
resource "aws_cloudfront_distribution" "default_redirect" {
  origin {
    domain_name = aws_s3_bucket.default_redirect.website_endpoint
    origin_id = local.origin_id

    custom_origin_config {
      http_port = 80
      https_port = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols = ["TLSv1.2"]
    }
  }

  aliases = ["www.${var.domain}"]

  enabled = true
  is_ipv6_enabled = true

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = local.origin_id

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "allow-all"
    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.default.certificate_arn
    ssl_support_method = "sni-only"
    minimum_protocol_version = "TLSv1.1_2016"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

#### Cloudflare DNS

Finally, further DNS records are made in Cloudflare to point the domains to the domain names provided by Cloudfront, completing the setup.

```
resource "cloudflare_record" "website_root" {
  domain  = var.domain
  name    = var.domain
  value   = aws_cloudfront_distribution.default.domain_name
  type    = "CNAME"
  ttl     = 3600
}

resource "cloudflare_record" "website_redirect" {
  domain  = var.domain
  name    = "www"
  value   = aws_cloudfront_distribution.default_redirect.domain_name
  type    = "CNAME"
  ttl     = 3600
}
```

## Gitlab Terraform Configuration

The `gitlab_repo` module sets up a GitLab repository for the website with pipelines (CI) enabled. The module itself takes a few variables used for the configuration.

```
variable "name" {
  description = "The name to use"
  type        = string
}

variable "description" {
  description = "The description to add to the project"
  type        = string
}

variable "visibility" {
  description = "The visibility level to use"
  default     = "private"
  type        = string
}

variable "variables" {
  description = "The variables to add to the project"
  default     = {}
  type        = map
}
```

The main configuration sets up the repository, variables used for the CI are added to the repo’s CI settings, and pipeline schedules are Set Up for weekly and annual builds. These schedules help provide a dynamic way to display dates shown on the website.

```
terraform {
  required_version = ">= 0.12.6"
}

locals {
  cron_timezone = "Australia/Sydney"
}

resource "gitlab_project" "default" {
  name                                  = var.name
  description                           = var.description
  default_branch                        = "master"
  visibility_level                      = var.visibility
  only_allow_merge_if_pipeline_succeeds = true
  shared_runners_enabled                = true
}

resource "gitlab_project_variable" "default" {
  for_each  = var.variables
  project   = gitlab_project.default.id
  key       = each.key
  value     = each.value
  protected = false
}

resource "gitlab_pipeline_schedule" "weekly" {
  project       = gitlab_project.default.id
  description   = "Weekly update"
  ref           = "master"
  cron          = "0 4 * * 1"
  cron_timezone = local.cron_timezone
}

resource "gitlab_pipeline_schedule" "annually" {
  project       = gitlab_project.default.id
  description  = "New Year Update"
  ref           = "master"
  cron          = "20 0 1 1 *"
  cron_timezone = local.cron_timezone
}
```

## Individual Website Terraform Configuration

The website's main.tf file sets up everything specific to the domain, calling the `static_website_aws_cloudflare` and `git_repo` modules and storing the state file in a separate S3 bucket. An example using this website is shown below.

```
terraform {
  backend "s3" {
    bucket  = "[[Terraform's S3 bucket]]"
    key     = "websites/alexgardner.id.au/terraform.tfstate"
    region  = "ap-southeast-2"
    encrypt = true
  }
}

locals {
  domain           = "alexgardner.id.au"
  aws_region       = "ap-southeast-2"
  gitlab_variables = {
    AWS_ACCESS_KEY_ID     = module.static_website_aws_cloudflare.iam_user_access_key_id,
    AWS_SECRET_ACCESS_KEY = module.static_website_aws_cloudflare.iam_user_secret_access_key,
    AWS_REGION            = local.aws_region,
    AWS_S3_BUCKET         = module.static_website_aws_cloudflare.s3_bucket,
  }
}

provider "aws" {
  region = local.aws_region
}

provider "gitlab" {}

provider "cloudflare" {}

module "static_website_aws_cloudflare" {
  source = "../../modules/services/website/static-website-aws-cloudflare"
  domain = local.domain
}

module "git_repo" {
  source      = "../../modules/services/gitlab-repo"
  name        = local.domain
  variables   = local.gitlab_variables
  description = "Website for ${local.domain}"
}
```

## Gitlab CI Configuration

With this all set up, everything the Gitlab CI needs to build and upload the website is configured. The CI configuration itself is straightforward, it builds the site and then uploads the files to the primary S3 bucket.

```
image: ruby:2.4

stages:
  - build
  - deploy

build-jekyll:
  stage: build
  before_script:
    - apt-get update -qq && apt-get install -y -qq nodejs
  script:
    - bundle install
    - bundle exec jekyll build
  artifacts:
    name: "site-files-$CI_COMMIT_REF_NAME"
    paths:
      - _site
    expire_in: 1 hour

deploy-to-s3:
  image: python:latest
  stage: deploy
  before_script:
    - pip install awscli
  script:
    - aws s3 cp _site s3://$AWS_S3_BUCKET/ --recursive
  dependencies:
    - build-jekyll
  only:
    - master
```

{% include blog_image.html image="website-aws-ci" format="jpg" alt="Gitlab Pipelines Successful" %}

These changes streamline the website even further and in my view is an example of where website development is currently heading, especially for websites with no dynamic content. Services such as [netlify][netlify] further cement my view on this and are even easier to set up than what I’ve outlined here.

[workflow]:  {% link _posts/2018-01-24-redesigning-website-update-workflow.md %}
[gitlab-ci]: https://about.gitlab.com/product/continuous-integration/
[buildbot]:  https://buildbot.net/
[netlify]:   https://www.netlify.com/
