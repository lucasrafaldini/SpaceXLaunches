from django.urls import re_path
from .apis import (
    SpaceXView,
)

service_instance = SpaceXView()

urlpatterns = [
    re_path(r"all_launches/$", service_instance.launches_view),
    re_path(r"next_launch/$", service_instance.next_launch),
    re_path(r"last_launch/$", service_instance.last_launch),
    re_path(r"next_launches/$", service_instance.next_launches),
    re_path(r"last_launches/$", service_instance.last_launches),
]
