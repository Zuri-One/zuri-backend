#!/bin/bash

# Exit on error
set -e

# Create main project directory
mkdir -p aml-platform
cd aml-platform

# Create app directory and its subdirectories
mkdir -p app/core app/collectors app/models app/resolvers app/api

# Create test directory
mkdir -p tests

# Create __init__.py files
touch app/__init__.py
touch app/core/__init__.py
touch app/collectors/__init__.py
touch app/models/__init__.py
touch app/resolvers/__init__.py
touch app/api/__init__.py
touch tests/__init__.py

# Create base files
cat > app/main.py << 'EOF'
from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(title="AML Platform")
app.include_router(router)

@app.get("/")
async def root():
    return {"message": "AML Platform is running"}
EOF

cat > app/core/config.py << 'EOF'
import os
from typing import Dict, List, Optional, Any

class Settings:
    PROJECT_NAME: str = "AML Platform"
    API_V1_STR: str = "/api/v1"
    
    # Timeouts and limits
    SCRAPER_TIMEOUT: int = 30  # seconds
    WHOIS_TIMEOUT: int = 10  # seconds
    DNS_TIMEOUT: int = 5  # seconds
    MAX_RETRIES: int = 3
    
    # User agent rotation
    USER_AGENTS: List[str] = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
    ]

settings = Settings()
EOF

cat > app/core/orchestrator.py << 'EOF'
import asyncio
import logging
from typing import Dict, List, Any, Optional
from app.models.entity import Entity
from app.collectors.whois_collector import WhoisCollector
from app.collectors.dns_collector import DnsCollector
from app.collectors.business_collector import BusinessRegistryCollector
from app.collectors.web_collector import WebCollector
from app.resolvers.entity_resolver import EntityResolver

logger = logging.getLogger(__name__)

class Orchestrator:
    """Main orchestrator to coordinate data collection across different sources"""
    
    def __init__(self):
        self.whois_collector = WhoisCollector()
        self.dns_collector = DnsCollector()
        self.business_collector = BusinessRegistryCollector()
        self.web_collector = WebCollector()
        self.entity_resolver = EntityResolver()
        
    async def collect_entity_data(self, entity_name: str, domain: Optional[str] = None) -> Entity:
        """Collect comprehensive data about an entity from all available sources"""
        logger.info(f"Starting data collection for entity: {entity_name}")
        
        # Create initial entity
        entity = Entity(name=entity_name)
        if domain:
            entity.domains.append(domain)
        
        # Run collectors in parallel
        tasks = []
        
        # Always run business registry collector
        tasks.append(self.business_collector.collect(entity_name))
        
        # Run domain-specific collectors if domain is provided
        if domain:
            tasks.append(self.whois_collector.collect(domain))
            tasks.append(self.dns_collector.collect(domain))
        
        # Run web collector
        tasks.append(self.web_collector.collect(entity_name))
        
        # Wait for all collectors to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error during collection: {str(result)}")
                continue
                
            if result:
                # Merge data into the entity
                entity = self.entity_resolver.merge_entity_data(entity, result)
        
        logger.info(f"Completed data collection for entity: {entity_name}")
        return entity
EOF

cat > app/models/entity.py << 'EOF'
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from datetime import datetime

@dataclass
class Entity:
    """Entity data model to store all collected information about a business or NGO"""
    name: str
    aliases: List[str] = field(default_factory=list)
    domains: List[str] = field(default_factory=list)
    emails: List[str] = field(default_factory=list)
    phones: List[str] = field(default_factory=list)
    addresses: List[str] = field(default_factory=list)
    
    # Registration information
    registration_ids: Dict[str, str] = field(default_factory=dict)  # country -> registration ID
    registration_dates: Dict[str, datetime] = field(default_factory=dict)
    registration_status: Optional[str] = None
    
    # Domain information
    domain_registrar: Optional[str] = None
    domain_creation_date: Optional[datetime] = None
    domain_expiration_date: Optional[datetime] = None
    domain_registrant: Optional[str] = None
    domain_registrant_email: Optional[str] = None
    
    # DNS information
    dns_records: Dict[str, List[str]] = field(default_factory=dict)
    
    # Web presence
    social_media: Dict[str, str] = field(default_factory=dict)
    website_data: Dict[str, Any] = field(default_factory=dict)
    
    # Risk indicators
    risk_indicators: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary for API responses"""
        result = {
            "name": self.name,
            "aliases": self.aliases,
            "domains": self.domains,
            "emails": self.emails,
            "phones": self.phones,
            "addresses": self.addresses,
            "registration": {
                "ids": self.registration_ids,
                "status": self.registration_status
            },
            "domain_info": {
                "registrar": self.domain_registrar,
                "registrant": self.domain_registrant,
                "registrant_email": self.domain_registrant_email
            },
            "dns_records": self.dns_records,
            "web_presence": {
                "social_media": self.social_media,
                "website_data": self.website_data
            },
            "risk_indicators": self.risk_indicators
        }
        
        # Handle datetime objects for JSON serialization
        if self.domain_creation_date:
            result["domain_info"]["creation_date"] = self.domain_creation_date.isoformat()
        if self.domain_expiration_date:
            result["domain_info"]["expiration_date"] = self.domain_expiration_date.isoformat()
            
        registration_dates = {}
        for country, date in self.registration_dates.items():
            registration_dates[country] = date.isoformat()
        
        if registration_dates:
            result["registration"]["dates"] = registration_dates
            
        return result
EOF

cat > app/collectors/base.py << 'EOF'
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import logging
import random
import asyncio
from app.core.config import settings

logger = logging.getLogger(__name__)

class BaseCollector(ABC):
    """Base class for all data collectors"""
    
    def __init__(self):
        self.timeout = settings.SCRAPER_TIMEOUT
        self.max_retries = settings.MAX_RETRIES
        self.user_agents = settings.USER_AGENTS
        
    def get_random_user_agent(self) -> str:
        """Get a random user agent from the configured list"""
        return random.choice(self.user_agents)
        
    async def retry_with_backoff(self, coro, max_retries: int = None):
        """Retry a coroutine with exponential backoff"""
        if max_retries is None:
            max_retries = self.max_retries
            
        retries = 0
        while True:
            try:
                return await coro
            except Exception as e:
                retries += 1
                if retries > max_retries:
                    logger.error(f"Maximum retries ({max_retries}) exceeded: {str(e)}")
                    raise
                
                # Exponential backoff with jitter
                delay = (2 ** retries) + random.uniform(0, 1)
                logger.warning(f"Retry {retries}/{max_retries} after {delay:.2f}s: {str(e)}")
                await asyncio.sleep(delay)
    
    @abstractmethod
    async def collect(self, *args, **kwargs) -> Any:
        """Collect data from the source. Must be implemented by subclasses."""
        pass
EOF

cat > app/collectors/whois_collector.py << 'EOF'
import logging
import asyncio
import re
from datetime import datetime
from typing import Dict, Any, Optional
import whois
from app.collectors.base import BaseCollector
from app.models.entity import Entity

logger = logging.getLogger(__name__)

class WhoisCollector(BaseCollector):
    """Collector for WHOIS data of domains"""
    
    def __init__(self):
        super().__init__()
        self.timeout = 10  # WHOIS queries can be slower
        
    async def collect(self, domain: str) -> Optional[Entity]:
        """Collect WHOIS information for a domain"""
        logger.info(f"Collecting WHOIS data for domain: {domain}")
        
        try:
            # Run whois query in a separate thread to not block the event loop
            loop = asyncio.get_event_loop()
            whois_data = await loop.run_in_executor(None, lambda: whois.whois(domain))
            
            if not whois_data or not whois_data.domain_name:
                logger.warning(f"No WHOIS data found for domain: {domain}")
                return None
                
            # Create entity with extracted information
            entity = Entity(name=domain)  # Using domain as initial name
            entity.domains.append(domain)
            
            # Extract registrar
            entity.domain_registrar = whois_data.registrar
            
            # Extract dates
            if whois_data.creation_date:
                # Handle if it's a list (some WHOIS providers return multiple dates)
                if isinstance(whois_data.creation_date, list):
                    entity.domain_creation_date = whois_data.creation_date[0]
                else:
                    entity.domain_creation_date = whois_data.creation_date
                    
            if whois_data.expiration_date:
                if isinstance(whois_data.expiration_date, list):
                    entity.domain_expiration_date = whois_data.expiration_date[0]
                else:
                    entity.domain_expiration_date = whois_data.expiration_date
            
            # Extract registrant information
            if hasattr(whois_data, 'registrant'):
                entity.domain_registrant = whois_data.registrant
                
            # Try to extract organization name
            org_name = None
            if hasattr(whois_data, 'org'):
                org_name = whois_data.org
            elif hasattr(whois_data, 'organization'):
                org_name = whois_data.organization
                
            if org_name:
                # If we found an organization name, use it as the primary name
                entity.name = org_name
                
            # Extract emails
            if whois_data.emails:
                if isinstance(whois_data.emails, list):
                    entity.emails.extend(whois_data.emails)
                else:
                    entity.emails.append(whois_data.emails)
                    
                # Set registrant email
                if entity.emails:
                    entity.domain_registrant_email = entity.emails[0]
            
            logger.info(f"Successfully collected WHOIS data for domain: {domain}")
            return entity
            
        except Exception as e:
            logger.error(f"Error collecting WHOIS data for {domain}: {str(e)}")
            return None
EOF

cat > app/collectors/dns_collector.py << 'EOF'
import logging
import asyncio
import socket
import dns.resolver
from typing import Dict, List, Any, Optional
from app.collectors.base import BaseCollector
from app.models.entity import Entity

logger = logging.getLogger(__name__)

class DnsCollector(BaseCollector):
    """Collector for DNS information of domains"""
    
    def __init__(self):
        super().__init__()
        self.timeout = 5  # DNS queries should be quick
        
    async def collect(self, domain: str) -> Optional[Entity]:
        """Collect DNS information for a domain"""
        logger.info(f"Collecting DNS data for domain: {domain}")
        
        entity = Entity(name=domain)  # Initially use domain as the name
        entity.domains.append(domain)
        entity.dns_records = {}
        
        # Record types to check
        record_types = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CNAME']
        
        for record_type in record_types:
            try:
                resolver = dns.resolver.Resolver()
                resolver.timeout = self.timeout
                resolver.lifetime = self.timeout
                
                # Using run_in_executor to prevent blocking the event loop
                loop = asyncio.get_event_loop()
                answers = await loop.run_in_executor(
                    None, 
                    lambda: resolver.resolve(domain, record_type)
                )
                
                records = []
                for rdata in answers:
                    records.append(str(rdata))
                
                if records:
                    entity.dns_records[record_type] = records
                    
                    # Extract emails from MX records
                    if record_type == 'MX':
                        for record in records:
                            # MX records format: "10 mail.example.com."
                            parts = record.split()
                            if len(parts) >= 2:
                                mx_domain = parts[1].rstrip('.')
                                # Add potential email domain to website data
                                if 'email_domains' not in entity.website_data:
                                    entity.website_data['email_domains'] = []
                                entity.website_data['email_domains'].append(mx_domain)
                    
                    # Look for SPF and DMARC records in TXT
                    if record_type == 'TXT':
                        for record in records:
                            if 'v=spf1' in record:
                                if 'spf' not in entity.website_data:
                                    entity.website_data['spf'] = []
                                entity.website_data['spf'].append(record)
                            
                            if 'DMARC' in record.upper():
                                if 'dmarc' not in entity.website_data:
                                    entity.website_data['dmarc'] = []
                                entity.website_data['dmarc'].append(record)
                
            except dns.resolver.NoAnswer:
                # This is normal for many domains and record types
                pass
            except dns.resolver.NXDOMAIN:
                logger.warning(f"Domain {domain} does not exist for {record_type} lookup")
            except dns.exception.Timeout:
                logger.warning(f"Timeout on DNS {record_type} lookup for {domain}")
            except Exception as e:
                logger.error(f"Error in DNS {record_type} lookup for {domain}: {str(e)}")
        
        # Try to get IP addresses
        try:
            ip_list = await loop.run_in_executor(
                None,
                lambda: socket.gethostbyname_ex(domain)[2]
            )
            if ip_list:
                entity.website_data['ip_addresses'] = ip_list
        except Exception as e:
            logger.error(f"Error getting IP addresses for {domain}: {str(e)}")
            
        logger.info(f"Completed DNS collection for domain: {domain}")
        return entity
EOF

cat > app/collectors/business_collector.py << 'EOF'
import logging
import asyncio
import aiohttp
import re
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
from app.collectors.base import BaseCollector
from app.models.entity import Entity

logger = logging.getLogger(__name__)

class BusinessRegistryCollector(BaseCollector):
    """Collector for business registry information"""
    
    def __init__(self):
        super().__init__()
        # List of open business registries to query
        self.registries = [
            {
                "name": "OpenCorporates",
                "url": "https://opencorporates.com/companies?q={query}",
                "parser": self._parse_opencorporates
            },
            {
                "name": "NGO Explorer",
                "url": "https://ngoexplorer.org/search?q={query}",
                "parser": self._parse_ngo_explorer
            }
            # More registries can be added here
        ]
    
    async def collect(self, entity_name: str) -> Optional[Entity]:
        """Collect business registry information for an entity"""
        logger.info(f"Collecting business registry data for: {entity_name}")
        
        entity = Entity(name=entity_name)
        
        # Replace spaces with + for URL encoding
        query = entity_name.replace(" ", "+")
        
        for registry in self.registries:
            try:
                url = registry["url"].format(query=query)
                parser = registry["parser"]
                
                async with aiohttp.ClientSession() as session:
                    headers = {"User-Agent": self.get_random_user_agent()}
                    
                    async with session.get(url, headers=headers, timeout=self.timeout) as response:
                        if response.status == 200:
                            html = await response.text()
                            
                            # Parse the registry-specific page
                            registry_data = await parser(html, entity_name)
                            
                            if registry_data:
                                # Merge registry data into entity
                                if registry_data.registration_ids:
                                    entity.registration_ids.update(registry_data.registration_ids)
                                    
                                if registry_data.registration_dates:
                                    entity.registration_dates.update(registry_data.registration_dates)
                                    
                                if registry_data.registration_status:
                                    entity.registration_status = registry_data.registration_status
                                    
                                # Merge other fields
                                if registry_data.aliases:
                                    for alias in registry_data.aliases:
                                        if alias not in entity.aliases:
                                            entity.aliases.append(alias)
                                            
                                if registry_data.addresses:
                                    for address in registry_data.addresses:
                                        if address not in entity.addresses:
                                            entity.addresses.append(address)
                                            
                                if registry_data.emails:
                                    for email in registry_data.emails:
                                        if email not in entity.emails:
                                            entity.emails.append(email)
                        else:
                            logger.warning(f"Failed to query {registry['name']}: HTTP {response.status}")
                
            except aiohttp.ClientError as e:
                logger.error(f"Error connecting to {registry['name']}: {str(e)}")
            except asyncio.TimeoutError:
                logger.error(f"Timeout connecting to {registry['name']}")
            except Exception as e:
                logger.error(f"Error in {registry['name']} collection: {str(e)}")
                
        logger.info(f"Completed business registry collection for: {entity_name}")
        return entity
    
    async def _parse_opencorporates(self, html: str, entity_name: str) -> Optional[Entity]:
        """Parse OpenCorporates search results"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            results = soup.select('.search-results .company')
            
            if not results:
                return None
                
            # Use the first result as the most relevant
            result = results[0]
            
            entity = Entity(name=entity_name)
            
            # Extract company name
            name_elem = result.select_one('.company-name')
            if name_elem:
                company_name = name_elem.text.strip()
                if company_name != entity_name:
                    entity.aliases.append(company_name)
            
            # Extract jurisdiction and company number
            jurisdiction_elem = result.select_one('.jurisdiction')
            company_number_elem = result.select_one('.company-number')
            
            if jurisdiction_elem and company_number_elem:
                jurisdiction = jurisdiction_elem.text.strip()
                company_number = company_number_elem.text.strip()
                entity.registration_ids[jurisdiction] = company_number
            
            # Extract status if available
            status_elem = result.select_one('.status')
            if status_elem:
                entity.registration_status = status_elem.text.strip()
                
            # Extract address if available
            address_elem = result.select_one('.registered-address')
            if address_elem:
                entity.addresses.append(address_elem.text.strip())
                
            return entity
            
        except Exception as e:
            logger.error(f"Error parsing OpenCorporates results: {str(e)}")
            return None
            
    async def _parse_ngo_explorer(self, html: str, entity_name: str) -> Optional[Entity]:
        """Parse NGO Explorer search results"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            results = soup.select('.ngo-result')
            
            if not results:
                return None
                
            # Use the first result as the most relevant
            result = results[0]
            
            entity = Entity(name=entity_name)
            
            # Extract NGO name
            name_elem = result.select_one('.ngo-name')
            if name_elem:
                ngo_name = name_elem.text.strip()
                if ngo_name != entity_name:
                    entity.aliases.append(ngo_name)
            
            # Extract registration information
            reg_elem = result.select_one('.registration-info')
            if reg_elem:
                # Extract country and registration number
                country_match = re.search(r'Country: ([^,]+)', reg_elem.text)
                if country_match:
                    country = country_match.group(1).strip()
                    
                reg_match = re.search(r'Registration: (\S+)', reg_elem.text)
                if reg_match and country_match:
                    reg_number = reg_match.group(1).strip()
                    entity.registration_ids[country] = reg_number
            
            # Extract status if available
            status_elem = result.select_one('.ngo-status')
            if status_elem:
                entity.registration_status = status_elem.text.strip()
                
            # Extract contact info
            contact_elem = result.select_one('.contact-info')
            if contact_elem:
                # Look for email
                email_match = re.search(r'[\w.-]+@[\w.-]+\.\w+', contact_elem.text)
                if email_match:
                    email = email_match.group(0)
                    entity.emails.append(email)
                    
                # Look for address
                address_elem = contact_elem.select_one('.address')
                if address_elem:
                    entity.addresses.append(address_elem.text.strip())
                
            return entity
            
        except Exception as e:
            logger.error(f"Error parsing NGO Explorer results: {str(e)}")
            return None
EOF

cat > app/collectors/web_collector.py << 'EOF'
import logging
import asyncio
import aiohttp
import re
from typing import Dict, List, Any, Optional
from bs4 import BeautifulSoup
from app.collectors.base import BaseCollector
from app.models.entity import Entity

logger = logging.getLogger(__name__)

class WebCollector(BaseCollector):
    """Collector for web information about an entity"""
    
    def __init__(self):
        super().__init__()
        self.social_media_patterns = {
            "facebook": r"facebook\.com/([^/\s\"']+)",
            "twitter": r"twitter\.com/([^/\s\"']+)",
            "linkedin": r"linkedin\.com/company/([^/\s\"']+)",
            "instagram": r"instagram\.com/([^/\s\"']+)",
            "youtube": r"youtube\.com/(@?[^/\s\"']+)"
        }
        
    async def collect(self, entity_name: str) -> Optional[Entity]:
        """Collect web information for an entity"""
        logger.info(f"Collecting web data for: {entity_name}")
        
        entity = Entity(name=entity_name)
        
        # First, try to find the official website using a search engine
        website_url = await self._find_official_website(entity_name)
        
        if website_url:
            entity.website_data["url"] = website_url
            entity.domains.append(self._extract_domain(website_url))
            
            # Scrape the website for contact information and social media
            website_entity = await self._scrape_website(website_url, entity_name)
            
            if website_entity:
                # Merge website data into entity
                if website_entity.emails:
                    entity.emails.extend([e for e in website_entity.emails if e not in entity.emails])
                    
                if website_entity.phones:
                    entity.phones.extend([p for p in website_entity.phones if p not in entity.phones])
                    
                if website_entity.addresses:
                    entity.addresses.extend([a for a in website_entity.addresses if a not in entity.addresses])
                    
                if website_entity.social_media:
                    entity.social_media.update(website_entity.social_media)
        
        # Search for the entity on social media directly
        social_entity = await self._search_social_media(entity_name)
        
        if social_entity and social_entity.social_media:
            # Merge social media profiles
            for platform, url in social_entity.social_media.items():
                if platform not in entity.social_media:
                    entity.social_media[platform] = url
        
        logger.info(f"Completed web data collection for: {entity_name}")
        return entity
        
    async def _find_official_website(self, entity_name: str) -> Optional[str]:
        """Try to find the official website using a search engine"""
        try:
            # Format query for search
            query = f"{entity_name} official website"
            query = query.replace(" ", "+")
            
            # Using DuckDuckGo as it has fewer restrictions
            url = f"https://html.duckduckgo.com/html/?q={query}"
            
            async with aiohttp.ClientSession() as session:
                headers = {"User-Agent": self.get_random_user_agent()}
                
                async with session.get(url, headers=headers, timeout=self.timeout) as response:
                    if response.status == 200:
                        html = await response.text()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Extract search results
                        results = soup.select('.result__a')
                        
                        for result in results:
                            link = result.get('href')
                            if link and self._is_likely_official_site(link, entity_name):
                                # Clean up the URL
                                if '?' in link:
                                    link = link.split('?')[0]
                                return link
            
            return None
            
        except Exception as e:
            logger.error(f"Error finding official website for {entity_name}: {str(e)}")
            return None
            
    def _is_likely_official_site(self, url: str, entity_name: str) -> bool:
        """Check if a URL is likely to be the official website"""
        # Exclude common non-official sites
        exclude_domains = [
            'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 
            'youtube.com', 'wikipedia.org', 'bloomberg.com', 'crunchbase.com',
            'yelp.com', 'yellowpages.com', 'bbb.org', 'glassdoor.com'
        ]
        
        for domain in exclude_domains:
            if domain in url:
                return False
                
        # Check if entity name is in the domain
        domain = self._extract_domain(url)
        
        # Simplify entity name and domain for comparison
        simplified_name = entity_name.lower().replace(' ', '').replace('-', '').replace('_', '')
        simplified_domain = domain.lower().replace('-', '').replace('_', '')
        
        # Check if simplified name is in simplified domain
        # This is a simple heuristic and would need improvement for accuracy
        return simplified_name in simplified_domain
        
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        match = re.search(r'https?://(?:www\.)?([^/]+)', url)
        if match:
            return match.group(1)
        return url
        
    async def _scrape_website(self, url: str, entity_name: str) -> Optional[Entity]:
        """Scrape a website for contact information and social media"""
        logger.info(f"Scraping website: {url}")
        
        try:
            entity = Entity(name=entity_name)
            
            async with aiohttp.ClientSession() as session:
                headers = {"User-Agent": self.get_random_user_agent()}
                
                # First, scrape the main page
                async with session.get(url, headers=headers, timeout=self.timeout) as response:
                    if response.status == 200:
                        html = await response.text()
                        
                        # Extract information from the main page
                        self._extract_info_from_html(html, entity)
                        
                        # Get links to contact and about pages
                        contact_links = self._extract_contact_links(html, url)
                        about_links = self._extract_about_links(html, url)
                        
                        # Scrape contact page if found
                        if contact_links:
                            for contact_url in contact_links[:1]:  # Just use the first one
                                try:
                                    async with session.get(contact_url, headers=headers, timeout=self.timeout) as contact_response:
                                        if contact_response.status == 200:
                                            contact_html = await contact_response.text()
                                            self._extract_info_from_html(contact_html, entity)
                                except Exception as e:
                                    logger.error(f"Error scraping contact page {contact_url}: {str(e)}")
                        
                        # Scrape about page if found
                        if about_links:
                            for about_url in about_links[:1]:  # Just use the first one
                                try:
                                    async with session.get(about_url, headers=headers, timeout=self.timeout) as about_response:
                                        if about_response.status == 200:
                                            about_html = await about_response.text()
                                            self._extract_info_from_html(about_html, entity)
                                except Exception as e:
                                    logger.error(f"Error scraping about page {about_url}: {str(e)}")
            
            return entity
            
        except Exception as e:
            logger.error(f"Error scraping website {url}: {str(e)}")
            return None
            
    def _extract_info_from_html(self, html: str, entity: Entity) -> None:
        """Extract contact info and social media from HTML"""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Extract emails
        email_pattern = r'[\w.-]+@[\w.-]+\.\w+'
        emails = re.findall(email_pattern, html)
        for email in emails:
            if email not in entity.emails:
                entity.emails.append(email)
                
        # Extract phone numbers (international format)
        phone_pattern = r'(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        phones = re.findall(phone_pattern, html)
        for phone in phones:
            if phone not in entity.phones:
                entity.phones.append(phone)
                
        # Extract addresses (this is more complex and less reliable)
        address_elements = soup.select('.address, .contact-address, [itemprop="address"]')
        for element in address_elements:
            address = element.text.strip()
            if address and address not in entity.addresses:
                entity.addresses.append(address)
                
        # Extract social media links
        for platform, pattern in self.social_media_patterns.items():
            matches = re.findall(pattern, html)
            if matches:
                # Use the first match for each platform
                entity.social_media[platform] = f"https://{platform}.com/{matches[0]}"
                
    def _extract_contact_links(self, html: str, base_url: str) -> List[str]:
        """Extract links to contact pages"""
        soup = BeautifulSoup(html, 'html.parser')
        contact_links = []
        
        # Look for links with "contact" in text or href
        for link in soup.find_all('a'):
            href = link.get('href')
            text = link.text.lower()
            
            if href and ('contact' in href.lower() or 'contact' in text):
                # Handle relative URLs
                if href.startswith('/'):
                    domain = self._extract_domain(base_url)
                    href = f"https://{domain}{href}"
                elif not href.startswith(('http://', 'https://')):
                    if base_url.endswith('/'):
                        href = f"{base_url}{href}"
                    else:
                        href = f"{base_url}/{href}"
                        
                contact_links.append(href)
                
        return contact_links
        
    def _extract_about_links(self, html: str, base_url: str) -> List[str]:
        """Extract links to about pages"""
        soup = BeautifulSoup(html, 'html.parser')
        about_links = []
        
        # Look for links with "about" in text or href
        for link in soup.find_all('a'):
            href = link.get('href')
            text = link.text.lower()
            
            if href and ('about' in href.lower() or 'about' in text):
                # Handle relative URLs
                if href.startswith('/'):
                    domain = self._extract_domain(base_url)
                    href = f"https://{domain}{href}"
                elif not href.startswith(('http://', 'https://')):
                    if base_url.endswith('/'):
                        href = f"{base_url}{href}"
                    else:
                        href = f"{base_url}/{href}"
                        
                about_links.append(href)
                
        return about_links
        
    async def _search_social_media(self, entity_name: str) -> Optional[Entity]:
        """Search for the entity on social media platforms"""
        entity = Entity(name=entity_name)
        
        # This would ideally use platform-specific search APIs
        # For now, we'll use a very basic approach with search engines
        
        query = f"{entity_name} social media"
        query = query.replace(" ", "+")
        
        try:
            url = f"https://html.duckduckgo.com/html/?q={query}"
            
            async with aiohttp.ClientSession() as session:
                headers = {"User-Agent": self.get_random_user_agent()}
                
                async with session.get(url, headers=headers, timeout=self.timeout) as response:
                    if response.status == 200:
                        html = await response.text()
                        
                        # Extract social media links from search results
                        for platform, pattern in self.social_media_patterns.items():
                            matches = re.findall(pattern, html)
                            if matches:
                                # Check if it's likely to be the entity's profile
                                # This would need more sophisticated matching in a real system
                                for match in matches[:3]:  # Check top 3 matches
                                    if self._is_likely_match(match, entity_name):
                                        entity.social_media[platform] = f"https://{platform}.com/{match}"
                                        break
            
            return entity
            
        except Exception as e:
            logger.error(f"Error searching social media for {entity_name}: {str(e)}")
            return None
            
    def _is_likely_match(self, username: str, entity_name: str) -> bool:
        """Check if a username is likely to match the entity"""
        # Simplify both strings for comparison
        simplified_name = entity_name.lower().replace(' ', '').replace('-', '').replace('_', '')
        simplified_username = username.lower().replace('-', '').replace('_', '')
        
        # Check if simplified name is in username or vice versa
        return simplified_name in simplified_username or simplified_username in simplified_name
EOF

cat > app/resolvers/entity_resolver.py << 'EOF'
import logging
from typing import Dict, List, Any, Optional
from app.models.entity import Entity

logger = logging.getLogger(__name__)

class EntityResolver:
    """Resolver to merge and deduplicate entity data from different sources"""
    
    def merge_entity_data(self, target: Entity, source: Entity) -> Entity:
        """Merge data from source entity into target entity"""
        # If names differ, add source name as an alias
        if source.name != target.name and source.name not in target.aliases:
            target.aliases.append(source.name)
            
        # Merge aliases
        for alias in source.aliases:
            if alias not in target.aliases and alias != target.name:
                target.aliases.append(alias)
                
        # Merge domains
        for domain in source.domains:
            if domain not in target.domains:
                target.domains.append(domain)
                
        # Merge emails
        for email in source.emails:
            if email not in target.emails:
                target.emails.append(email)
                
        # Merge phones
        for phone in source.phones:
            if phone not in target.phones:
                target.phones.append(phone)
                
        # Merge addresses
        for address in source.addresses:
            if address not in target.addresses:
                target.addresses.append(address)
                
        # Merge registration IDs
        for country, reg_id in source.registration_ids.items():
            if country not in target.registration_ids:
                target.registration_ids[country] = reg_id
                
        # Merge registration dates
        for country, date in source.registration_dates.items():
            if country not in target.registration_dates:
                target.registration_dates[country] = date
                
        # Take registration status if target doesn't have one
        if not target.registration_status and source.registration_status:
            target.registration_status = source.registration_status
            
        # Merge domain information
        if not target.domain_registrar and source.domain_registrar:
            target.domain_registrar = source.domain_registrar
            
        if not target.domain_creation_date and source.domain_creation_date:
            target.domain_creation_date = source.domain_creation_date
            
        if not target.domain_expiration_date and source.domain_expiration_date:
            target.domain_expiration_date = source.domain_expiration_date
            
        if not target.domain_registrant and source.domain_registrant:
            target.domain_registrant = source.domain_registrant
            
        if not target.domain_registrant_email and source.domain_registrant_email:
            target.domain_registrant_email = source.domain_registrant_email
            
        # Merge DNS records
        for record_type, records in source.dns_records.items():
            if record_type not in target.dns_records:
                target.dns_records[record_type] = records
            else:
                # Append unique records
                for record in records:
                    if record not in target.dns_records[record_type]:
                        target.dns_records[record_type].append(record)
                        
        # Merge social media
        for platform, url in source.social_media.items():
            if platform not in target.social_media:
                target.social_media[platform] = url
                
        # Merge website data
        for key, value in source.website_data.items():
            if key not in target.website_data:
                target.website_data[key] = value
            elif isinstance(value, list) and isinstance(target.website_data[key], list):
                # Merge lists
                for item in value:
                    if item not in target.website_data[key]:
                        target.website_data[key].append(item)
                        
        # Merge risk indicators
        for indicator in source.risk_indicators:
            if indicator not in target.risk_indicators:
                target.risk_indicators.append(indicator)
                
        return target
EOF

cat > app/api/routes.py << 'EOF'
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import logging
from app.core.orchestrator import Orchestrator

router = APIRouter(prefix="/api/v1")
logger = logging.getLogger(__name__)
orchestrator = Orchestrator()

class EntitySearchRequest(BaseModel):
    name: str
    domain: Optional[str] = None

class EntityResponse(BaseModel):
    name: str
    aliases: List[str]
    domains: List[str]
    emails: List[str]
    phones: List[str]
    addresses: List[str]
    registration: Dict[str, Any]
    domain_info: Dict[str, Any]
    dns_records: Dict[str, List[str]]
    web_presence: Dict[str, Any]
    risk_indicators: List[Dict[str, Any]]

@router.post("/entity/search", response_model=EntityResponse)
async def search_entity(request: EntitySearchRequest):
    """
    Search for comprehensive information about an entity
    """
    try:
        entity = await orchestrator.collect_entity_data(request.name, request.domain)
        return entity.to_dict()
    except Exception as e:
        logger.error(f"Error processing entity search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.get("/entity/{name}", response_model=EntityResponse)
async def get_entity(name: str, domain: Optional[str] = Query(None)):
    """
    Get comprehensive information about an entity
    """
    try:
        entity = await orchestrator.collect_entity_data(name, domain)
        return entity.to_dict()
    except Exception as e:
        logger.error(f"Error retrieving entity data: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving data: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy"}
EOF

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi>=0.95.0,<0.96.0
uvicorn>=0.22.0,<0.23.0
aiohttp>=3.8.4,<3.9.0
beautifulsoup4>=4.12.2,<4.13.0
python-whois>=0.8.0,<0.9.0
dnspython>=2.3.0,<2.4.0
pydantic>=1.10.7,<1.11.0
EOF

# Create test file
cat > tests/test_collectors.py << 'EOF'
import unittest
import asyncio
from app.collectors.whois_collector import WhoisCollector
from app.collectors.dns_collector import DnsCollector
from app.collectors.business_collector import BusinessRegistryCollector
from app.collectors.web_collector import WebCollector

class TestCollectors(unittest.TestCase):
    def test_whois_collector_init(self):
        collector = WhoisCollector()
        self.assertIsNotNone(collector)
        
    def test_dns_collector_init(self):
        collector = DnsCollector()
        self.assertIsNotNone(collector)
        
    def test_business_collector_init(self):
        collector = BusinessRegistryCollector()
        self.assertIsNotNone(collector)
        
    def test_web_collector_init(self):
        collector = WebCollector()
        self.assertIsNotNone(collector)
        
    # Add more tests as needed

if __name__ == '__main__':
    unittest.main()
EOF

# Create README
cat > README.md << 'EOF'
# AML Platform

A comprehensive Anti-Money Laundering (AML) platform for collecting and analyzing information about businesses and NGOs.

## Features

- Domain WHOIS data collection
- DNS information analysis
- Business registry data collection
- Web presence analysis
- Entity resolution and deduplication

## Setup

1. Create a Python 3.10 virtual environment:
```
python3.10 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Run the application:
```
uvicorn app.main:app --reload
```

## API Endpoints

- `GET /api/v1/entity/{name}` - Get comprehensive information about an entity
- `POST /api/v1/entity/search` - Search for entity information with additional parameters
- `GET /api/v1/health` - Health check endpoint

## Usage Example

```bash
# Get information about an entity
curl -X GET "http://localhost:8000/api/v1/entity/Acme%20Corporation?domain=acme.com"

# Search with more details
curl -X POST "http://localhost:8000/api/v1/entity/search" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corporation", "domain":"acme.com"}'
```
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
*.egg-info/
.installed.cfg
*.egg

# Virtual Environment
venv/
ENV/

# IDE files
.idea/
.vscode/
*.swp
*.swo

# Logs
*.log

# Local configuration
.env
EOF

echo "AML Platform project structure created successfully!"
echo "To start the project, run:"
echo "cd aml-platform"
echo "python3.10 -m venv venv"
echo "source venv/bin/activate"
echo "pip install -r requirements.txt"
echo "uvicorn app.main:app --reload"