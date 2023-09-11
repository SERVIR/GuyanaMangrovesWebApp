import json
from pathlib import Path

from django.contrib import messages
from django.shortcuts import render
from django.templatetags.static import static
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.decorators.csrf import csrf_exempt

from WebApp.forms import MeasurementForm
from WebApp.models import Measurement
# Build paths inside the project like this: BASE_DIR / 'subdir'.
from WebApp.utils import get_stations

BASE_DIR = Path(__file__).resolve().parent.parent
f = open(str(BASE_DIR) + '/data.json', )
data = json.load(f)

def home(request):
    return render(request, 'WebApp/home.html', {})

def login(request):
    return render(request, 'WebApp/login.html', {})

def about(request):
    return render(request, 'WebApp/about.html', {})

def dashboard(request):
    return render(request, 'WebApp/dashboard.html', {})

def map(request):
    return render(request, 'WebApp/map.html', {})

def instructions(request):
    return render(request, 'WebApp/instructions.html', {})

@xframe_options_exempt
def feedback(request):
    return render(request, 'WebApp/feedback.html', {})
