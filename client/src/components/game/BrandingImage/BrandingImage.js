import React, { Component } from 'react'
import './BrandingImage.scss'
import avatar from './../../../assets/game/dealer-hover-glance.png'

export const BrandingImage = () => {
  return (
    <div className="BrandingImage">
      <img className="img-brand" src={avatar} />
    </div>
  )
}

export default BrandingImage
