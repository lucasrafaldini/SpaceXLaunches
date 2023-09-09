from django.http import JsonResponse
from django.shortcuts import HttpResponse
import time
import datetime
import json
import requests
from .aux import http_method_list

DT_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"

class SpaceXView:

    def __init__(self):
        self.version = 'latest' # or v2 or v3 or v4
        self.url = f'http://api.spacexdata.com/{self.version}/launches'

    @http_method_list(["GET"])
    def launches_view(self, request):
        r = requests.get(self.url)
        if r.status_code == 200:
            response = r.json()
            return JsonResponse(response, safe=False)
        return HttpResponse("Something went wrong. ")

    @http_method_list(["GET"])
    def next_launches(self, request):
        next_launches = []
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

    @http_method_list(["GET"])
    def last_launches(self, request):
        last_launches = []
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

    @http_method_list(["GET"])
    def next_launch(self, request):
        next_launch = []
        all = self.next_launches(request)
        if all.content != b'[]':
            for launch in all:
                launch_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            all[all.content.index(launch)]["date_utc"], DT_FORMAT
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
            if not next_launch:
                return JsonResponse({'launches': 'No next launches.'}, safe=False)
            return JsonResponse(next_launch[0], safe=False)
        return HttpResponse("Something went wrong.")


    def last_launch(self, request):
        last_launch = []
        all = self.last_launches(request)
        for launch in all:
            launch_date = datetime.datetime.fromtimestamp(
                time.mktime(
                    time.strptime(
                        all[all.content.index(launch)]["date_utc"], DT_FORMAT
                    )
                )
            )
            if len(last_launch) == 0:
                last_launch.append(all[all.content.index(launch)])
            else:
                last_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            last_launch[0]["date_utc"], DT_FORMAT
                        )
                    )
                )
                if launch_date > last_date:
                    last_launch[0] = all[all.content.index(launch)]

        if all.status_code == 200:
            if not last_launch:
                return JsonResponse({'launches': 'No last launches.'}, safe=False)
            return JsonResponse(last_launch[0], safe=False)
        return HttpResponse("Something went wrong.")
