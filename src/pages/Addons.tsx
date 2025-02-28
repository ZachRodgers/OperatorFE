import React from "react";
import "./Addons.css";

const Addons = () => {
  return (
    <div className="content">
      <h1>Add-ons</h1>
      <p>
        Add-ons can help upgrade your parking lot even further and utilize stronger AI models, or give access to newer
        software we’ve built out to help tailor your parking lot.
      </p>

      <div className="addons-box">
        <h2>No Results Found</h2>
        <p>There are currently no Addons available in your location.</p>
        <a href="#">Learn more</a>
      </div>
    </div>
  );
};

export default Addons;
