import React from "react";

export default function InternalCoverInfo({ info }) {
  if (!info) return null;
  const {
    title,
    type,
    student,
    program,
    smer,
    mentor,
    somentor,
    lektor,
  } = info;

  return (
    <div className="card bg-base-100 shadow-lg mb-6">
      <div className="card-body">
        <h2 className="card-title">Notranja naslovna stran</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {title && (
            <>
              <div className="font-semibold">Naslov dela:</div>
              <div>{title}</div>
            </>
          )}
          {type && (
            <>
              <div className="font-semibold">Vrsta dela:</div>
              <div>{type}</div>
            </>
          )}
          {student && (
            <>
              <div className="font-semibold">Študent(ka):</div>
              <div>{student}</div>
            </>
          )}
          {program && (
            <>
              <div className="font-semibold">Študijski program:</div>
              <div>{program}</div>
            </>
          )}
          {smer && (
            <>
              <div className="font-semibold">Smer:</div>
              <div>{smer}</div>
            </>
          )}
          {mentor && (
            <>
              <div className="font-semibold">Mentor(ica):</div>
              <div>{mentor}</div>
            </>
          )}
          {somentor && (
            <>
              <div className="font-semibold">Somentor(ica):</div>
              <div>{somentor}</div>
            </>
          )}
          {lektor && (
            <>
              <div className="font-semibold">Lektor(ica):</div>
              <div>{lektor}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}