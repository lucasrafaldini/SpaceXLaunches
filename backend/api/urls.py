from django.conf.urls import url
from .views import LaunchesView, nextLaunches, lastLaunches, nextLaunch, lastLaunch


urlpatterns = [
    url('all_launches/$', LaunchesView),
    url(r'next_launch/$', nextLaunch),
    url(r'last_launch/$', lastLaunch),
    url('next_launches/$', nextLaunches),
    url('last_launches/$', lastLaunches)
]