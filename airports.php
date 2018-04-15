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

   $query = 'SELECT DISTINCT origin FROM flights ORDER BY origin';

   $json = array();

   $ret = $db->query($query);
   while ($row = $ret->fetchArray(SQLITE3_ASSOC) ) {
      $json[] = $row['origin'];
   }
   echo json_encode($json, JSON_UNESCAPED_SLASHES);

   $db->close();
?>
