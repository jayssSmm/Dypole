import streamlit as st
import requests

st.title("Dypole")

lat = st.number_input("Latitude")
lon = st.number_input("Longitude")

if st.button("Predict"):

    response = requests.get(
        "https://YOUR-BACKEND/predict",
        params={
            "lat": lat,
            "lon": lon,
            "uncertainty": True
        }
    )

    data = response.json()

    st.write(data)