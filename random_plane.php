<?php
   class MyDB extends SQLite3 {
      function __construct() {
         $this->open('flights.db');
      }
   }
   $db = new MyDB();
   if(!$db) {
      echo $db->lastErrorMsg();
   }

   parse_str($_SERVER['QUERY_STRING'], $args);
   $carrier = $args['carrier'];

   if ($carrier) {
      $valid = array('AA', 'DL', 'UA', 'WN', 'AS', 'VX', 'HA', 'B6', 'NK', 'F9', 'OO', 'EV', '9E', 'OH', 'G4', 'MQ', 'YV', 'YX');
      if (!in_array($carrier, $valid)) {
         $carrier = 'AA';
      }
      $query1 = 'SELECT tail_num FROM flights WHERE carrier = \'' . $carrier . '\' ORDER BY RANDOM() LIMIT 1;';
   } else {
      $query1 = 'SELECT tail_num FROM flights WHERE rowid = abs(random()) % (SELECT max(rowid) FROM flights) + 1;';
   }

   $ret = $db->query($query1);
   $plane = $ret->fetchArray(SQLITE3_ASSOC)['tail_num'];
   $query2 = 'SELECT * FROM flights WHERE tail_num = \'' . $plane . '\'';

   $json = array();

   $ret = $db->query($query2);
   while ($row = $ret->fetchArray(SQLITE3_ASSOC) ) {
      $item = array(
         'date' => $row['date'],
         'carrier' => $row['carrier'],
         'flightNum' => (integer)$row['flight_num'],
         'tailNum' => $row['tail_num'],
         'origin' => $row['origin'],
         'dest' => $row['dest'],
         'depTime' => (integer)$row['dep_time'],
         'arrDelay' => (integer)$row['arr_delay']
      );
      $json[] = $item;
   }
   echo json_encode($json, JSON_UNESCAPED_SLASHES);

   $db->close();
?>
