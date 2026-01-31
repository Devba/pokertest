const config = {
  isProduction: process.env.NODE_ENV === 'production',
  contentfulSpaceId: process.env.REACT_APP_CONTENTFUL_SPACE_ID,
  contentfulAccessToken: process.env.REACT_APP_CONTENTFUL_ACCESS_TOKEN,
  socketURI:
    process.env.NODE_ENV === 'production'
      ? process.env.REACT_APP_SERVER_URI
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://improved-eureka-7rq5j5rq5q3p5q9-7777.app.github.dev/`,
};

export default config;