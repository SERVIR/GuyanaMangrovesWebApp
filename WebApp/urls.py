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
    path('map/', views.map, name='map'),
    path('login/', views.login, name='login'),
    path('feedback/', views.feedback, name='feedback'),

    path('map/get-extent-layer/', api_handlers.get_mangrove_layer, name='get-extent-layer'),
    path('map/get-change-layer/', api_handlers.get_mangrove_layer, name='get-change-layer'),
    path('map/get-impact-layer/', api_handlers.get_mangrove_layer, name='get-impact-layer'),
    path('map/get-available-years/', api_handlers.get_available_years, name='get-available-years')

]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
