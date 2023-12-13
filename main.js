import "./style.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON.js";
import Control from "ol/control/Control";
import Overlay from "ol/Overlay";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Select from "ol/interaction/Select";
import CircleStyle from "ol/style/Circle.js";

let allFeatures;

const defaultExtent = [
  1243452.5977866652, 1125117.8235923792, 1321036.181496119, 1179082.3655617135,
];

const map = new Map({
  target: "map",
  view: new View({
    center: [1282244.389641392, 1152100.0945770463],
    zoom: 12,
    extent: defaultExtent,
  }),
});

const OSMlayer = new TileLayer({
  source: new OSM(),
});
map.addLayer(OSMlayer);

// Style for the default state of features
const defaultStyle = new Style({
  fill: new Fill({
    color: "rgba(255, 0, 0, 0.3)",
  }),
  stroke: new Stroke({
    color: "rgba(255, 0, 0, 0.9)",
    width: 1.2,
  }),
});

// Style for the highlighted state of features
const highlightStyle = new Style({
  fill: new Fill({
    color: "rgba(255, 255, 0, 0.5)", // Yellow fill color
  }),
  stroke: new Stroke({
    color: "#ffffff",
    width: 2,
  }),
});

const vectorLayer = new VectorLayer({
  source: new VectorSource({
    url: "./data/farmboundary.geojson",
    format: new GeoJSON(),
  }),
  style: defaultStyle, // Apply default style to all features
});
map.addLayer(vectorLayer);

// Create a point layer
const pointLayer = new VectorLayer({
  source: new VectorSource({
    url: "./data/infrastructures.geojson", // Replace with the path to your point layer GeoJSON file
    format: new GeoJSON(),
  }),
  style: new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({
        color: "rgba(0, 0, 255, 0.8)", // Blue fill color
      }),
      stroke: new Stroke({
        color: "#ffffff",
        width: 2,
      }),
    }),
  }),
});
map.addLayer(pointLayer);

// Popup Overlay
const popupContainer = document.getElementById("popup");
const popupContent = document.getElementById("popup-content");
const popupCloser = document.getElementById("popup-closer");

const popupOverlay = new Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: {
    duration: 250,
  },
});

map.addOverlay(popupOverlay);

// Select interaction to handle feature selection
const select = new Select({
  layers: [vectorLayer],
  style: highlightStyle,
});

map.addInteraction(select);

// Function to update the sidebar table with feature information
function updateSidebarTable(features) {
  const tbody = document.querySelector("#feature-table tbody");
  tbody.innerHTML = ""; // Clear existing rows

  // Check if features is defined and is an array
  if (!features || !Array.isArray(features)) {
    console.error("Invalid features data:", features);
    return;
  }

  const filterInput = document
    .querySelector("#filter-input")
    .value.toLowerCase();

  // Counter variable to keep track of the serial number
  let counter = 1;

  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    const properties = feature.getProperties();
    const name = properties.First_name || "N/A";
    const lname = properties.Last_name || "N/A";
    const iD = properties.Uniq_Ident || "N/A";

    // Check if the feature matches the filter criteria
    if (
      name.toLowerCase().includes(filterInput) ||
      lname.toLowerCase().includes(filterInput) ||
      iD.toLowerCase().includes(filterInput)
    ) {
      const row = document.createElement("tr");

      // Add a serial number (index) to each row
      const serialCell = document.createElement("td");
      serialCell.textContent = counter++;

      const nameCell = document.createElement("td");
      const ageCell = document.createElement("td");
      const idCell = document.createElement("td");

      nameCell.textContent = name;
      ageCell.textContent = lname;
      idCell.textContent = iD;

      row.appendChild(serialCell);
      row.appendChild(nameCell);
      row.appendChild(ageCell);
      row.appendChild(idCell);
      tbody.appendChild(row);

      // Add click event listener to zoom to the feature on the map
      row.addEventListener("click", function () {
        const extent = feature.getGeometry().getExtent();
        map.getView().fit(extent, { duration: 1000, maxZoom: 16 });

        // Highlight the clicked feature
        highlightFeature(feature);
      });
    }
  }
}

// Function to highlight the selected feature on the map
function highlightFeature(feature) {
  // Clear existing highlight styles
  vectorLayer
    .getSource()
    .getFeatures()
    .forEach((f) => {
      f.setStyle(defaultStyle);
    });

  // Apply highlight style to the selected feature
  feature.setStyle(highlightStyle);
}

// Update the sidebar table when the map is rendered
map.on("postcompose", function () {
  const vectorSource = vectorLayer.getSource();
  allFeatures = vectorSource.getFeatures(); // Update allFeatures
  updateSidebarTable(allFeatures);
});

// Add a click event listener to the map
map.on("click", function (event) {
  // Check for features in both vector and point layers
  const vectorFeature = map.forEachFeatureAtPixel(
    event.pixel,
    function (feature) {
      return feature;
    },
    {
      layerFilter: function (layer) {
        return layer === vectorLayer;
      },
    }
  );

  const pointFeature = map.forEachFeatureAtPixel(
    event.pixel,
    function (feature) {
      return feature;
    },
    {
      layerFilter: function (layer) {
        return layer === pointLayer;
      },
    }
  );

  // Display popup based on the clicked feature type
  if (vectorFeature) {
    // Display popup for vector layer (polygon) feature
    const properties = vectorFeature.getProperties();
    const contentHTML = `<p><b>Unique ID:</b> ${properties.Uniq_Ident}</p>
      <p><b>Ownership Means:</b> ${properties.Means_of_L}</p>
      <p><b>Area(ha):</b> ${Number(properties.Farm_Area_).toFixed(3)}</p>
      <p><b>Crop Grown:</b> 0${properties.Crop_grown}</p>
      <p><b>First Name:</b> ${properties.First_name}</p>
      <p><b>Last Name:</b> ${properties.Last_name}</p>
      <p><b>Gender:</b> ${properties.Gender}</p>
      <p><b>Phone:</b> 0${properties.Mobile_Num}</p>
      <p><b>Experience:</b> ${properties.Exprience_}yrs</p>
      <p><b>Photo Link:</b> <a href="${
        properties.Photograph
      }">click here to view</a></p>
      <img src="${properties.Photograph}" alt="Photo" style="width:100%;">`;

    // Update popup content
    popupContent.innerHTML = contentHTML;

    // Calculate optimal position to fit the view
    const optimalPosition = adjustPopupPosition(event.coordinate);

    // Show popup
    popupOverlay.setPosition(optimalPosition);
    popupContainer.style.display = "block";
  } else if (pointFeature) {
    // Display popup for point layer feature
    const properties = pointFeature.getProperties();
    const contentHTML = `<p><b>Type of Infrastructure:</b> ${properties.Type_of__1}</p>
    <p><b>Location:</b> ${properties.Location_o}</p>
    <p><b>Description:</b> ${properties.condition}</p>
    <p><b>360 Panorama View:</b> <a href="${properties.photograph}">click here to view</a></p>`;

    // Update popup content
    popupContent.innerHTML = contentHTML;

    // Calculate optimal position to fit the view
    const optimalPosition = adjustPopupPosition(event.coordinate);

    // Show popup
    popupOverlay.setPosition(optimalPosition);
    popupContainer.style.display = "block";
  } else {
    // Hide popup if no feature is clicked
    popupContainer.style.display = "none";
  }
});

// Add an input event listener to the filter input field
const filterInput = document.querySelector("#filter-input");
filterInput.addEventListener("input", function () {
  updateSidebarTable(allFeatures); // Use the updated allFeatures variable
});

// Close the popup when the close button is clicked
popupCloser.onclick = function () {
  popupContainer.style.display = "none";
  return false;
};

// Function to adjust popup position to fit the view
function adjustPopupPosition(coordinate) {
  const pixel = map.getPixelFromCoordinate(coordinate);
  const mapSize = map.getSize();

  // Check if the popup is outside the visible map area
  const offsetX =
    pixel[0] < 0
      ? -pixel[0]
      : pixel[0] > mapSize[0]
      ? mapSize[0] - pixel[0]
      : 0;
  const offsetY =
    pixel[1] < 0
      ? -pixel[1]
      : pixel[1] > mapSize[1]
      ? mapSize[1] - pixel[1]
      : 0;

  return map.getCoordinateFromPixel([pixel[0] + offsetX, pixel[1] + offsetY]);
}

var homeButton = document.createElement("button");
homeButton.innerHTML = "Home";
// '<img src="resources/images/home.svg" alt="" style="width: 20px; height: 20px; filter:brightness(0) invert(1); vertical-align:middle"></img>';
homeButton.className = "myButton";
homeButton.id = "homeButton";

var homeElement = document.createElement("div");
homeElement.className = "homeButtonDiv";
homeElement.appendChild(homeButton);

// Define the default extent or view you want to set when the "Home" button is clicked

var HomeControl = new Control({
  element: homeElement,
});

// Add a click event listener to the "Home" button
homeButton.addEventListener("click", function () {
  map.getView().fit(defaultExtent, { duration: 2000 }); // Fit the view to the default extent
});

map.addControl(HomeControl);

//DKIS Project Site
var dkisButton = document.createElement("button");
dkisButton.innerHTML = "Zoom to DKIS Farmlands";
// '<img src="resources/images/home.svg" alt="" style="width: 20px; height: 20px; filter:brightness(0) invert(1); vertical-align:middle"></img>';
dkisButton.className = "myButton";
dkisButton.id = "dkisButton";

var dkisElement = document.createElement("div");
dkisElement.className = "dkisButtonnDiv";
dkisElement.appendChild(dkisButton);

// Define the default extent or view you want to set when the "Home" button is clicked
var disextent = [
  1277802.9894, 1149417.90719754, 1286441.183338, 1154167.72831068,
]; // Define your desired extent

var DkisControl = new Control({
  element: dkisElement,
});

// Add a click event listener to the "Home" button
dkisButton.addEventListener("click", function () {
  map.getView().fit(disextent, { duration: 3000, maxZoom: 19 }); // Fit the view to the default extent
});

map.addControl(DkisControl);
