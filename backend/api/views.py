from django.http import JsonResponse
from django.shortcuts import HttpResponse
import time
import datetime
import json
import requests


def LaunchesView(request):
    if request.method != 'GET':
        return HttpResponse('Your request isn\'t sucessful because this endpoint just allow GET method.')
    if request.method == 'GET':
        r = requests.get('https://api.spacexdata.com/v3/launches')
    if r.status_code == 200:
        response = r.json()
        return JsonResponse(response, safe=False)
    return HttpResponse('Something went wrong. ')

def nextLaunches(request):
    dt_format = '%Y-%m-%dT%H:%M:%S.%fZ'
    next_launches = {}
    if request.method != 'GET':
        return HttpResponse('Your request isn\'t sucessful because this endpoint just allow GET method.')
    if request.method == 'GET':
        all = LaunchesView(request)
        response = json.loads(all.content)
        for launch in response:
            now_obj = datetime.datetime.utcnow()
            dt_obj = datetime.datetime.fromtimestamp(time.mktime(time.strptime(launch['launch_date_utc'], dt_format)))
            if dt_obj >= now_obj:
                next_launches[launch['flight_number']] = launch
    if all.status_code == 200:
        return JsonResponse(next_launches, safe=False)

def lastLaunches(request):
    dt_format = '%Y-%m-%dT%H:%M:%S.%fZ'
    last_launches = {}
    if request.method != 'GET':
        return HttpResponse('Your request isn\'t sucessful because this endpoint just allow GET method.')
    if request.method == 'GET':
        all = LaunchesView(request)
        response = json.loads(all.content)
        for launch in response:
            now_obj = datetime.datetime.utcnow()
            dt_obj = datetime.datetime.fromtimestamp(time.mktime(time.strptime(launch['launch_date_utc'], dt_format)))
            if dt_obj <= now_obj:
                last_launches[launch['flight_number']] = launch
    if all.status_code == 200:
        return JsonResponse(last_launches, safe=False)

def nextLaunch(request):
    dt_format = '%Y-%m-%dT%H:%M:%S.%fZ'
    next_launch = {}
    if request.method != 'GET':
        return HttpResponse('Your request isn\'t sucessful because this endpoint just allow GET method.')
    if request.method == 'GET':
        response = nextLaunches(request)
        all = json.loads(response.content)
        for launch in all:
            launch_date = datetime.datetime.fromtimestamp(time.mktime(time.strptime(all[launch]['launch_date_utc'], dt_format)))
            if len(next_launch) == 0:
                next_launch.update(all[launch])
            else:
                next_date = datetime.datetime.fromtimestamp(time.mktime(time.strptime(next_launch['launch_date_utc'], dt_format)))
                if launch_date < next_date:
                    next_launch.update(all[launch])

    if response.status_code == 200:
        return JsonResponse(next_launch, safe=False)

def lastLaunch(request):
    dt_format = '%Y-%m-%dT%H:%M:%S.%fZ'
    last_launch = {}
    if request.method != 'GET':
        return HttpResponse('Your request isn\'t sucessful because this endpoint just allow GET method.')
    if request.method == 'GET':
        response = lastLaunches(request)
        all = json.loads(response.content)
        for launch in all:
            launch_date = datetime.datetime.fromtimestamp(
                time.mktime(time.strptime(all[launch]['launch_date_utc'], dt_format)))
            if len(last_launch) == 0:
                last_launch.update(all[launch])
            else:
                last_date = datetime.datetime.fromtimestamp(
                    time.mktime(time.strptime(last_launch['launch_date_utc'], dt_format)))
                if launch_date > last_date:
                    last_launch.update(all[launch])

    if response.status_code == 200:
        return JsonResponse(last_launch, safe=False)