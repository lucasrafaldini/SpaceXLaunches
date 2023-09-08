from django.urls import re_path, include

urlpatterns = [re_path("api/", include("api.urls"))]
