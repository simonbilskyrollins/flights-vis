import requests
from bs4 import BeautifulSoup as bs
import re, sys, io, zipfile, sqlite3
import pandas as pd

data_url = 'https://www.bts.dot.gov/browse-statistical-products-and-data/bts-publications/airline-service-quality-performance-234-time'
r = requests.get(data_url)
html = r.text

soup = bs(html, 'html.parser')

link = soup.find('a', href=re.compile('files/docs/legacy/additional-attachment-files/ONTIME'))
server_latest = link.string

update = False
try:
    with open('latest.txt', 'r') as f:
        local_latest = f.read()
    if server_latest != local_latest:
        update = True
except FileNotFoundError:
    update = True

if not update:
    sys.exit()

r = requests.get('https://www.bts.dot.gov' + link['href'], stream=True)
with zipfile.ZipFile(io.BytesIO(r.content)) as z:
    filename = z.namelist()[0]
    with z.open(filename) as f:
        flights = pd.read_table(f, sep='|', header=None, dtype=object)

flights = flights[[0,1,2,3,4,8,17,21]]       # select only the columns we need
flights = flights.dropna(axis=0, how='any')  # delete rows with NAs in any column
flights.columns = ['carrier', 'flight_num', 'origin', 'dest', 'date', 'dep_time', 'arr_delay', 'tail_num']

conn = sqlite3.connect('flights.db')
pd.io.sql.to_sql(flights, 'flights', conn, if_exists='replace', index=False)

with open('latest.txt', 'w') as f:
    f.write(server_latest)
