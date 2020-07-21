from django.http import JsonResponse
from django.shortcuts import HttpResponse
import time
import datetime
import json
import requests

DT_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"


def LaunchesView(request):
    if request.method != "GET":
        return HttpResponse(
            "Your request isn't sucessful because this endpoint just allow GET method."
        )

    r = requests.get("https://api.spacexdata.com/v3/launches")
    if r.status_code == 200:
        response = r.json()
        return JsonResponse(response, safe=False)
    return HttpResponse("Something went wrong. ")


def nextLaunches(request):
    next_launches = []
    if request.method != "GET":
        return HttpResponse(
            "Your request isn't sucessful because this endpoint just allow GET method."
        )

    all = LaunchesView(request)
    response = json.loads(all.content)
    for launch in response:
        now_obj = datetime.datetime.utcnow()
        dt_obj = datetime.datetime.fromtimestamp(
            time.mktime(time.strptime(launch["launch_date_utc"], DT_FORMAT))
        )
        if dt_obj >= now_obj:
            next_launches.append(launch)
    if all.status_code == 200:
        return JsonResponse(next_launches, safe=False)


def lastLaunches(request):
    last_launches = []
    if request.method != "GET":
        return HttpResponse(
            "Your request isn't sucessful because this endpoint just allow GET method."
        )
    if request.method == "GET":
        all = LaunchesView(request)
        response = json.loads(all.content)
        for launch in response:
            now_obj = datetime.datetime.utcnow()
            dt_obj = datetime.datetime.fromtimestamp(
                time.mktime(time.strptime(launch["launch_date_utc"], DT_FORMAT))
            )
            if dt_obj <= now_obj:
                last_launches.append(launch)
    if all.status_code == 200:
        return JsonResponse(last_launches, safe=False)


def nextLaunch(request):
    next_launch = []
    if request.method != "GET":
        return HttpResponse(
            "Your request isn't sucessful because this endpoint just allow GET method."
        )
    if request.method == "GET":
        response = nextLaunches(request)
        all = json.loads(response.content)
        for launch in all:
            launch_date = datetime.datetime.fromtimestamp(
                time.mktime(
                    time.strptime(
                        all[all.index(launch)]["launch_date_utc"], DT_FORMAT
                    )
                )
            )
            if len(next_launch) == 0:
                next_launch.append(all[all.index(launch)])
            else:
                next_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            next_launch[0]["launch_date_utc"], DT_FORMAT
                        )
                    )
                )
                if launch_date > next_date:
                    next_launch[0] = all[all.index(launch)]

    if response.status_code == 200:
        return JsonResponse(next_launch[0], safe=False)


def lastLaunch(request):
    last_launch = []
    if request.method != "GET":
        return HttpResponse(
            "Your request isn't sucessful because this endpoint just allow GET method."
        )
    if request.method == "GET":
        response = lastLaunches(request)
        all = json.loads(response.content)
        for launch in all:
            launch_date = datetime.datetime.fromtimestamp(
                time.mktime(
                    time.strptime(
                        all[all.index(launch)]["launch_date_utc"], DT_FORMAT
                    )
                )
            )
            if len(last_launch) == 0:
                last_launch.append(all[all.index(launch)])
            else:
                last_date = datetime.datetime.fromtimestamp(
                    time.mktime(
                        time.strptime(
                            last_launch[0]["launch_date_utc"], DT_FORMAT
                        )
                    )
                )
                if launch_date > last_date:
                    last_launch[0] = all[all.index(launch)]

    if response.status_code == 200:
        return JsonResponse(last_launch[0], safe=False)
