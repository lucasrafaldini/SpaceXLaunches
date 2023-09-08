from django.http import JsonResponse
from django.shortcuts import HttpResponse
import time
import datetime
import json
import requests

DT_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"

class SpaceXViews:

    def __init__(self):
        self.version = 'latest' # or v2 or v3 or v4
        self.url = f'http://api.spacexdata.com/{self.version}/launches'

    def launches_view(self, request):
        if request.method != "GET":
            return HttpResponse(
                "Your request isn't sucessful because this endpoint just allow GET method."
            )

        r = requests.get(self.url)
        if r.status_code == 200:
            response = r.json()
            return JsonResponse(response, safe=False)
        return HttpResponse("Something went wrong. ")

    def next_launches(self, request):
        next_launches = []
        if request.method != "GET":
            return HttpResponse(
                "Your request isn't sucessful because this endpoint just allow GET method."
            )

        all = self.launches_view(request)
        response = json.loads(all.content)
        for launch in response:
            now_obj = datetime.datetime.utcnow()
            dt_obj = datetime.datetime.fromtimestamp(
                time.mktime(time.strptime(launch["date_utc"], DT_FORMAT))
            )
            if dt_obj >= now_obj:
                next_launches.append(launch)
        if all.status_code == 200:
            return JsonResponse(next_launches, safe=False)


    def last_launches(self, request):
        last_launches = []
        if request.method != "GET":
            return HttpResponse(
                "Your request isn't sucessful because this endpoint just allow GET method."
            )
        if request.method == "GET":
            all = self.launches_view(request)
            response = json.loads(all.content)
            for launch in response:
                now_obj = datetime.datetime.utcnow()
                dt_obj = datetime.datetime.fromtimestamp(
                    time.mktime(time.strptime(launch["date_utc"], DT_FORMAT))
                )
                if dt_obj <= now_obj:
                    last_launches.append(launch)
        if all.status_code == 200:
            return JsonResponse(last_launches, safe=False)


    def next_launch(self, request):
        next_launch = []
        if request.method != "GET":
            return HttpResponse(
                "Your request isn't sucessful because this endpoint just allow GET method."
            )
        if request.method == "GET":
            all = self.next_launches(request)
            # breakpoint()
            for launch in all:
                launch_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            all[all.index(launch)]["date_utc"], DT_FORMAT
                        )
                    )
                )
                if len(next_launch) == 0:
                    next_launch.append(all[all.index(launch)])
                else:
                    next_date = datetime.datetime.fromtimestamp(
                        time.mktime(
                            time.strptime(
                                next_launch[0]["date_utc"], DT_FORMAT
                            )
                        )
                    )
                    if launch_date > next_date:
                        next_launch[0] = all[all.index(launch)]

        if all.status_code == 200:
            return JsonResponse(next_launch[0], safe=False)


    def last_launch(self, request):
        last_launch = []
        if request.method != "GET":
            return HttpResponse(
                "Your request isn't sucessful because this endpoint just allow GET method."
            )
        if request.method == "GET":
            response = self.last_launches(request)
            all = json.loads(response.content)
            for launch in all:
                launch_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            all[all.index(launch)]["date_utc"], DT_FORMAT
                        )
                    )
                )
                if len(last_launch) == 0:
                    last_launch.append(all[all.index(launch)])
                else:
                    last_date = datetime.datetime.fromtimestamp(
                        time.mktime(
                            time.strptime(
                                last_launch[0]["date_utc"], DT_FORMAT
                            )
                        )
                    )
                    if launch_date > last_date:
                        last_launch[0] = all[all.index(launch)]

        if response.status_code == 200:
            return JsonResponse(last_launch[0], safe=False)
