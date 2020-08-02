from django.conf.urls import url
from .apis import (
    LaunchesView,
    nextLaunches,
    lastLaunches,
    nextLaunch,
    lastLaunch,
)


urlpatterns = [
    url(r"all_launches/$", LaunchesView),
    url(r"next_launch/$", nextLaunch),
    url(r"last_launch/$", lastLaunch),
    url(r"next_launches/$", nextLaunches),
    url(r"last_launches/$", lastLaunches),
]
