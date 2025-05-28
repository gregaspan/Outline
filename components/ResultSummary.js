import React from "react";

export default function ResultSummary({ frontMatter, bodySections }) {
  const fmPresent = Object.entries(frontMatter || {}).filter(([_, ok]) => ok);
  const fmMissing = Object.entries(frontMatter || {}).filter(([_, ok]) => !ok);
  const bsPresent = Object.entries(bodySections || {}).filter(([_, ok]) => ok);
  const bsMissing = Object.entries(bodySections || {}).filter(([_, ok]) => !ok);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Front Matter */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Predgovor (Front Matter)</h2>
          <div className="mt-2">
            <span className="font-medium">Prisotno:</span>{" "}
            {fmPresent.map(([sec], i) => (
              <span key={i} className="badge badge-success mx-1 my-1">
                {sec}
              </span>
            ))}
          </div>
          <div className="mt-2">
            <span className="font-medium">Manjka:</span>{" "}
            {fmMissing.map(([sec], i) => (
              <span key={i} className="badge badge-error mx-1 my-1">
                {sec}
              </span>
            ))}
          </div>
        </div>
      </div>
      {/* Body Sections */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h2 className="card-title">Vsebinski Deli</h2>
          <div className="mt-2">
            <span className="font-medium">Prisotno:</span>{" "}
            {bsPresent.map(([sec], i) => (
              <span key={i} className="badge badge-success mx-1 my-1">
                {sec}
              </span>
            ))}
          </div>
          <div className="mt-2">
            <span className="font-medium">Manjka:</span>{" "}
            {bsMissing.map(([sec], i) => (
              <span key={i} className="badge badge-error mx-1 my-1">
                {sec}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}