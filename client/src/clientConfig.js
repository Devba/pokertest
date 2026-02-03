const config = {
  isProduction: process.env.NODE_ENV === 'production',
  slvsro:"cualquiera",
  contentfulSpaceId: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
  contentfulAccessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN,
  socketURI: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://192.168.1.105:7777/`
 
};

export default config;