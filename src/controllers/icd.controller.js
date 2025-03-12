// src/controllers/icd.controller.js
const axios = require('axios');
const NodeCache = require('node-cache');

// Cache to store tokens and search results
const cache = new NodeCache({ stdTTL: 3500 }); // Token TTL slightly less than 1 hour

// ICD API configuration
const ICD_API_CONFIG = {
  tokenEndpoint: 'https://icdaccessmanagement.who.int/connect/token',
  baseUrl: 'https://id.who.int',
  searchUrl: 'https://id.who.int/icd/release/11/2023-01/mms/search',
  clientId: process.env.ICD_CLIENT_ID,
  clientSecret: process.env.ICD_CLIENT_SECRET,
  scope: 'icdapi_access',
  linearization: 'mms', // Default to Mortality and Morbidity Statistics
  language: 'en' // Default to English
};

/**
 * Get an access token from the ICD API
 * @returns {Promise<string>} Access token
 */
const getAccessToken = async () => {
  // Check if we have a cached token
  const cachedToken = cache.get('icd_access_token');
  if (cachedToken) {
    return cachedToken;
  }

  try {
    // Prepare form data for token request
    const params = new URLSearchParams();
    params.append('client_id', ICD_API_CONFIG.clientId);
    params.append('client_secret', ICD_API_CONFIG.clientSecret);
    params.append('scope', ICD_API_CONFIG.scope);
    params.append('grant_type', 'client_credentials');

    // Request token
    const response = await axios.post(ICD_API_CONFIG.tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const token = response.data.access_token;
    
    // Cache the token (default TTL is set in the cache initialization)
    cache.set('icd_access_token', token);
    
    return token;
  } catch (error) {
    console.error('Error obtaining ICD API access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with ICD API');
  }
};

/**
 * Remove HTML tags from a string
 * @param {string} str - String with HTML tags
 * @returns {string} Clean string without HTML tags
 */
const removeHtmlTags = (str) => {
  if (!str) return '';
  return str.replace(/<\/?[^>]+(>|$)/g, '');
};

/**
 * Search ICD entities by query
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.searchICD = async (req, res, next) => {
  try {
    const { 
      q, 
      page = 1, 
      pageSize = 20, 
      language = ICD_API_CONFIG.language,
      format = 'detailed' // Options: 'simple', 'detailed'
    } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }

    // Generate cache key based on query params
    const cacheKey = `icd_search_${q}_${page}_${pageSize}_${language}_${format}`;
    
    // Check cache first
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) {
      return res.json({
        success: true,
        count: cachedResults.length,
        data: cachedResults,
        meta: {
          source: 'cache',
          query: q,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        }
      });
    }

    // Get access token
    const token = await getAccessToken();

    // Build search URL with query parameters
    const searchParams = new URLSearchParams({
      q: q.trim(),
      useFlexisearch: 'true',
      flatResults: 'true',
      highlightingEnabled: 'true',
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    // Make search request to ICD API
    const response = await axios.get(`${ICD_API_CONFIG.searchUrl}?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': language
      }
    });

    let formattedResults;
    
    if (format === 'simple') {
      // Simple format: just code and title for easy selection
      formattedResults = response.data.destinationEntities?.map(entity => ({
        code: entity.code || entity.theCode,
        title: removeHtmlTags(entity.title)
      })) || [];
    } else {
      // Detailed format: more comprehensive information
      formattedResults = response.data.destinationEntities?.map(entity => ({
        id: entity.id,
        code: entity.code || entity.theCode,
        title: removeHtmlTags(entity.title),
        uri: entity.uri,
        chapter: entity.chapter,
        linearizationName: entity.linearizationName || 'MMS',
        isLeaf: entity.isLeaf,
        isMMS: entity.isMMS
      })) || [];
    }

    // Cache the results for 10 minutes
    cache.set(cacheKey, formattedResults, 600);

    res.json({
      success: true,
      count: formattedResults.length,
      data: formattedResults,
      meta: {
        source: 'api',
        query: q,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('ICD search error:', error.response?.data || error.message);
    next(error);
  }
};

/**
 * Get ICD entity details by code or URI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getICDEntity = async (req, res, next) => {
  try {
    const { codeOrUri } = req.params;
    const { 
      language = ICD_API_CONFIG.language,
      format = 'detailed' // Options: 'simple', 'detailed'
    } = req.query;
    
    if (!codeOrUri) {
      return res.status(400).json({
        success: false,
        message: 'Code or URI is required'
      });
    }

    // Generate cache key
    const cacheKey = `icd_entity_${codeOrUri}_${language}_${format}`;
    
    // Check cache first
    const cachedEntity = cache.get(cacheKey);
    if (cachedEntity) {
      return res.json({
        success: true,
        data: cachedEntity,
        meta: {
          source: 'cache',
          codeOrUri
        }
      });
    }

    // Get access token
    const token = await getAccessToken();

    // Determine if it's a code or URI
    let entityUri = codeOrUri;
    if (!codeOrUri.startsWith('http')) {
      // It's a code, construct the URI
      entityUri = `${ICD_API_CONFIG.baseUrl}/icd/release/11/2023-01/${ICD_API_CONFIG.linearization}/${codeOrUri}`;
    }

    // Make request to ICD API
    const response = await axios.get(entityUri, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'API-Version': 'v2',
        'Accept-Language': language
      }
    });

    // Get raw entity data
    const entityData = response.data;
    
    let formattedEntity;
    
    if (format === 'simple') {
      // Simple format: basic information about the entity
      formattedEntity = {
        code: entityData.code || entityData.theCode,
        title: entityData.title,
        definition: entityData.definition || entityData.longDefinition,
        inclusions: entityData.inclusion || [],
        exclusions: entityData.exclusion || []
      };
    } else {
      // Detailed format: comprehensive information
      formattedEntity = {
        id: entityData.id || entityData['@id'],
        code: entityData.code || entityData.theCode,
        title: entityData.title,
        definition: entityData.definition || entityData.longDefinition,
        fullySpecifiedName: entityData.fullySpecifiedName,
        source: entityData.source,
        inclusion: entityData.inclusion || [],
        exclusion: entityData.exclusion || [],
        indexTerms: entityData.indexTerm || [],
        parents: entityData.parent || [],
        children: entityData.child || [],
        ancestors: entityData.ancestor || [],
        descendants: entityData.descendant || [],
        linearization: entityData.linearization || 'mms',
        classKind: entityData.classKind,
        chapter: entityData.chapter,
        blockId: entityData.blockId
      };
    }
    
    // Clean up any HTML tags in text fields
    for (const key in formattedEntity) {
      if (typeof formattedEntity[key] === 'string') {
        formattedEntity[key] = removeHtmlTags(formattedEntity[key]);
      }
    }
    
    // Cache the entity data for 1 hour
    cache.set(cacheKey, formattedEntity, 3600);

    res.json({
      success: true,
      data: formattedEntity,
      meta: {
        source: 'api',
        codeOrUri
      }
    });
  } catch (error) {
    console.error('ICD entity retrieval error:', error.response?.data || error.message);
    next(error);
  }
};

/**
 * Clear the ICD API cache
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.clearCache = (req, res) => {
  const { type } = req.query;
  
  if (type === 'token') {
    cache.del('icd_access_token');
    res.json({
      success: true,
      message: 'Token cache cleared'
    });
  } else if (type === 'search') {
    // Clear all search cache keys
    const keys = cache.keys();
    const searchKeys = keys.filter(key => key.startsWith('icd_search_'));
    searchKeys.forEach(key => cache.del(key));
    
    res.json({
      success: true,
      message: `Cleared ${searchKeys.length} search cache entries`
    });
  } else if (type === 'entity') {
    // Clear all entity cache keys
    const keys = cache.keys();
    const entityKeys = keys.filter(key => key.startsWith('icd_entity_'));
    entityKeys.forEach(key => cache.del(key));
    
    res.json({
      success: true,
      message: `Cleared ${entityKeys.length} entity cache entries`
    });
  } else {
    // Clear all cache
    cache.flushAll();
    res.json({
      success: true,
      message: 'All ICD API cache cleared'
    });
  }
};

/**
 * Debug ICD API - only enabled in development environment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.debugICD = (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      message: 'Debug endpoint only available in development environment'
    });
  }
  
  // Get cache stats
  const stats = cache.getStats();
  
  // Get all cache keys
  const keys = cache.keys();
  const tokenKeys = keys.filter(key => key.startsWith('icd_access_token'));
  const searchKeys = keys.filter(key => key.startsWith('icd_search_'));
  const entityKeys = keys.filter(key => key.startsWith('icd_entity_'));
  
  res.json({
    success: true,
    cacheStats: stats,
    cacheKeys: {
      total: keys.length,
      token: tokenKeys.length,
      search: searchKeys.length,
      entity: entityKeys.length
    },
    config: {
      baseUrl: ICD_API_CONFIG.baseUrl,
      searchUrl: ICD_API_CONFIG.searchUrl,
      tokenEndpoint: ICD_API_CONFIG.tokenEndpoint,
      linearization: ICD_API_CONFIG.linearization,
      language: ICD_API_CONFIG.language
    }
  });
};