/*
Reverse Solarization v2
Jason Contangelo
2023
*/

PImage img;

// add image to sketch folder and replace imgFileName with file name
String imgFileName = "imgFileName";
String imgFileType = "jpg";

Boolean GlitchSaved = false;
Boolean GlitchComplete = false;

void settings() {
  img = loadImage(imgFileName+"."+imgFileType);
  size(img.width, img.height);
}

void setup() {
  colorMode(RGB, 255, 255, 255);
  image(img, 0, 0);
}

void draw() {
  if(!GlitchComplete)
  {
  loadPixels();  
  img.loadPixels(); 
  for (int x = 0; x < img.width; x++) {
  for (int y = 0; y < img.height; y++ ) {
    int loc = x + y*img.width;
    float r = red   (img.pixels[loc]);
    float g = green (img.pixels[loc]);
    float b = blue  (img.pixels[loc]); 
    
    //selects all pixels below a combined value, 383 is halfway between light/dark
    if((r+g+b) < 383)
    {
      //inverts color values with random degree of noise
      r = abs(r-random(205, 305));
      g = abs(g-random(205, 305));
      b = abs(b-random(205, 305));
    }
    color c = color(r,g,b);
    pixels[loc] = c;
    pixels[loc] =  color(r,g,b);          
    }
  }
  }
  
  GlitchComplete = true;
  updatePixels();
  
  if (!GlitchSaved)
  {
  save(imgFileName+"_rev_sol_rgb.jpg");
  GlitchSaved = true;
  println("Image Saved");
  println("Click or press any key to exit...");
  }
}

void keyPressed() {
  if (GlitchSaved)
  {
    System.exit(0);
  }
}

void mouseClicked() {
  if (GlitchSaved)
  {
    System.exit(0);
  }
}
