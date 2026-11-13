import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import "./img-zoom.css";

const ImageZoomViewer = ({ imageSrc, altText, zoomOutIcon, zoomInIcon, handDragIcon, rotateIcon }) => {
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const handleZoomOut = useCallback(() => {
    setScale(prevScale => Math.max(prevScale - 25, 50));
  }, []);

  const handleZoomIn = useCallback(() => {
    setScale(prevScale => Math.min(prevScale + 25, 300));
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prevRotation => (prevRotation + 90) % 360);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setStartPosition({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - startPosition.x,
      y: e.clientY - startPosition.y
    });
  }, [isDragging, startPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseUp, handleMouseMove, handleMouseLeave]);

  return (
    <div className="position-relative border w-100 d-inline-block rounded-1 br16 text-center my-3 image-controller-wrapper">
      <div
        ref={containerRef}
        className="image-container position-relative overflow-hidden"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <img
          ref={imageRef}
          src={imageSrc}
          alt={altText}
          className="br16"
          style={{
            transform: `scale(${scale / 100}) translate(${position.x / (scale / 100)}px, ${position.y / (scale / 100)}px) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s',
            userSelect: 'none',
            objectFit: 'cover',
            height: '290px',
          }}
          draggable="false"
        />
      </div>
      <div className="image-controls bg-white">
        <div className="d-flex justify-content-center align-items-center">
          <a href="#" className="zoom-icon" onClick={(e) => { e.preventDefault(); handleZoomOut(); }}>
            <img src={zoomOutIcon} alt="Zoom Out" width="20" height="20" />
          </a>
          <span className="zoom-percentage ml5">{scale}%</span>
          <a href="#" className="zoom-out-icon ml5" onClick={(e) => { e.preventDefault(); handleZoomIn(); }}>
            <img src={zoomInIcon} alt="Zoom In" width="20" height="20" />
          </a>
          <a href="#" className="hand-icon ml5" onClick={(e) => e.preventDefault()}>
            <img src={handDragIcon} width="20" height="20" alt="Hand Drag Tool" />
          </a>
          <a href="#" className="rotate-icon ml-2" onClick={(e) => { e.preventDefault(); handleRotate(); }}>
            <img src={rotateIcon} width="20" height="20" alt="Rotate" />
          </a>
        </div>
      </div>
    </div>
  );
};

ImageZoomViewer.propTypes = {
  imageSrc: PropTypes.string.isRequired,
  altText: PropTypes.string,
  zoomOutIcon: PropTypes.string.isRequired,
  zoomInIcon: PropTypes.string.isRequired,
  handDragIcon: PropTypes.string.isRequired,
  rotateIcon: PropTypes.string.isRequired
};

export default ImageZoomViewer;