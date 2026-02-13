const config = {
  isProduction: process.env.NODE_ENV === 'production',
  slvsro:"cualquiera",
  contentfulSpaceId: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
  contentfulAccessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN,
  socketURI: window.location.origin
 
};

export default config;