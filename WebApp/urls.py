from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

import WebApp.views as views
from WebApp import api_handlers

urlpatterns = [
    path('', views.home, name='home'),
    path('methodology/', views.home, name='methodology'),
    path('about/', views.about, name='about'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('login/', views.login, name='login'),
    path('feedback/', views.feedback, name='feedback'),

    path('dashboard/get-fire-events/', api_handlers.get_fire_events, name='get-fire-events'),
    path('dashboard/get-fire-detections/', api_handlers.get_fire_detections, name='get-fire-detections'),
    path('dashboard/get-fire-tables/', api_handlers.get_fire_tables, name='get-fire-events'),
    path('dashboard/get-fire-events-chart/', api_handlers.get_fire_events_chart, name='get-fire-events-chart'),
    path('dashboard/get-states/', api_handlers.get_states, name='get-states'),
    path('dashboard/get-countries/', api_handlers.get_countries, name='get-countries'),
    path('dashboard/get-fire-events-zip/', api_handlers.get_fire_events_zip, name='get-fire-events-zip'),
    path('dashboard/get-chart-dates/', api_handlers.get_chart_dates, name='get-chart-dates'),

]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
