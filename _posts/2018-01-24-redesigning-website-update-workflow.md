---
layout: post
title: "Redesigning website update workflow"
date: 2018-01-24 23:39 +1100
permalink: /blog/:title/
comments: true
categories: [Website]
titleimage: website-workflow.jpg
---

Today I made a significant change to the workflow I use to update both this website, as well as the website for my [re-enactment][re-enactment] group. For context, the websites are hosted on a VPS, running nginx as it's web-server. Since I am using [jekyll][jekyll] to build the websites, I make all changes, as well as basic testing on my workstation. Once the desired update is ready, I use jekyll to generate the static html files.

Previously I'd simply run the build locally, and then securely copy the files across to the VPS, placing them in the relevant directories, and ensuring that they have the correct permissions. For change management, the files are in local git repos, which gets pushed to a gitlab instance I'm hosting in my [homelab][homelab]. This process was fairly hands on, and is technical enough that most of the stakeholders for the re-enactment website would not be able to make any changes.

Enter the upgrade, Firstly I migrated the private gitlab instance to [github][github]. I partially chose this because I was required to make a github account for a training course I completed late last year (and ended up not using it anyway). The other reason is that it allows me to use an [admin panel][admin] for the re-enactment website if this is ever required.

Once this was completed, I then setup a Continuous Integration (CI) server to get the changes via git, and then build and publish the website. I ended up choosing Buildbot as the CI software. This was to ensure the CI was as lean as possible, and still allow enough flexibility to build the website, matching my previous workflow.

The configuration is fairly straightforward for anyone that is familiar with python, and has read the documentation. Below are some excerpts of the config that powers this website.

```python
####### CHANGESOURCES

# the 'change_source' setting tells the buildmaster how it should find out
# about source code changes.  Here we point to the buildbot version of a python hello-world project.

c['change_source'] = []
c['change_source'].append(changes.GitPoller(
        repourl='git://github.com/ThorgrimA/alexgardner.id.au.git',
        branches=['master', 'preview'],
        project='alexgardner.id.au',
        pollAtLaunch=True,
        pollinterval=600))

####### SCHEDULERS

# Configure the Schedulers, which decide how to react to incoming changes.  In this
# case, just kick off a 'runtests' build

c['schedulers'] = []
c['schedulers'].append(schedulers.SingleBranchScheduler(
                            name="alexgardner.id.au",
                            change_filter=util.ChangeFilter(project='alexgardner.id.au', branch='master'),
                            builderNames=["alexgardner.id.au"]))
```

```python
####### BUILDERS

# The 'builders' list defines the Builders, which tell Buildbot how to perform a build:
# what steps, and which workers can execute them.  Note that any particular build will
# only take place on one worker.

c['builders'] = []

##############################################################################################
# Alexgardner Build steps

f_alexgardner = util.BuildFactory()

f_alexgardner.addStep(steps.Git(
  name="Git Pull", haltOnFailure=True,
  repourl='git://github.com/ThorgrimA/alexgardner.id.au', branch='master',
  mode='full', method='fresh', submodules=True, progress=True))

f_alexgardner.addStep(steps.ShellCommand(
  name="Bundle Install", haltOnFailure=True,
  command=["/home/buildbot/.rvm/wrappers/ruby-2.2.5/bundle", "install"]))

f_alexgardner.addStep(steps.ShellCommand(
  name="Bundle Exec Jekyll Build", haltOnFailure=True,
  command=["/home/buildbot/.rvm/wrappers/ruby-2.2.5/bundle", "exec", "jekyll", "build"]))

f_alexgardner.addStep(steps.ShellCommand(
  name="Transfer Files", haltOnFailure=True,
  command=["/home/buildbot/jekyll-builds/transfer-alexgardner.sh"]))

f_alexgardner.addStep(steps.RemoveDirectory(name="Cleaning Up", dir="build"))

c['builders'].append(
    util.BuilderConfig(name="alexgardner.id.au",
      workernames=["worker-1"],
      factory=f_alexgardner))
```

Buildbot does have a basic web GUI as well, and like most CI software details the steps configured for a build.

<div class="box alt">
    <div class="row uniform 50%">
        <div class="12u centre">
            <span class="image 12u">
                <img class="post-img centre" src="/assets/images/blog/website-workflow-1.jpg" title="The BuildBot Interface" alt="The BuildBot Interface">
            </span>
        </div>
    </div>
</div>

Overall I'm quite happy with the change, as it greatly simplifies updating this website/blog. An added benifit is that it will allow my re-enactment group to update their website without needing to know the details of the technology that builds the website.

[re-enactment]: {% link 30-reenactment.md %}
[jekyll]:       https://jekyllrb.com/
[homelab]:      {% link 20-homelab.md %}
[github]:       https://github.com/ThorgrimA
[admin]:        https://github.com/jekyll/jekyll-admin
