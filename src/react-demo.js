import React from "react";
import ReactDOM from "react-dom";

const element = (
  <div id="foo">
    <a>bar</a>
    <b />
  </div>
);
console.log("element", element);

const container = document.getElementById("react-root");
ReactDOM.render(element, container);
