/*
    This file is part of rt.

    rt is a simple ray tracer meant to be used for teaching ray tracing.

    Copyright (c) 2018 by Parag Chaudhuri

	Some parts of rt are derived from Nori by Wenzel Jacob.
	https://github.com/wjakob/nori/

    rt is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License Version 3
    as published by the Free Software Foundation.

    rt is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <http://www.gnu.org/licenses/>.
*/

#include <image.hpp>
#include <fstream>
#include <cstdlib>

using namespace rt;

image_t::image_t(int _w, int _h, color_t _bgc,unsigned int ns):width(_w),height(_h),num_samples(ns),bgcolor(_bgc)
{
	aspect = double(width)/double(height);
	data = new unsigned char[width*height*3]; 
}

image_t::image_t(const char * filename)
{
	unsigned char header[54];
	int pos;
	unsigned int size; //w*h*3

	std::FILE* file = fopen( filename, "rb" ); 
	if ( file == NULL ) 
	std::cerr<<"File read failed";  // if file is empty 
	if (fread(header,1,54,file)!=54)
	{
	std::cerr<<"Incorrect BMP file\n";
	}
	
	// Read  MetaData
	pos = *(int*)&(header[0x0A]);
	size = *(int*)&(header[0x22]);
	width = *(int*)&(header[0x12]);
	height = *(int*)&(header[0x16]);
	
	if(size == 0) 
      size = width*height*3;
    if(pos == 0)
      pos = 54;

	data = new unsigned char[size];

	unsigned char* tmpdata = new unsigned char[width*3];
	for(int i = 0; i < height; i++)
    {
		int ch;
        if((ch = fread(tmpdata, sizeof(unsigned char), width*3, file))<=0)
			std::cout<<"Bmp file read failed";
        for(int j = 0; j < width*3; j += 3)
        {
            // Convert (B, G, R) to (R, G, B)
            data[i*width*3+j+2] = tmpdata[j];
            data[i*width*3+j+1] = tmpdata[j+1];
            data[i*width*3+j] = tmpdata[j+2];
        }
    }

	// fread( data, sizeof(unsigned char), size, file ); // read the file
    fclose( file );
}



image_t::~image_t()
{ 
	delete data;
}

int image_t::get_width(void) const {return width; }
int image_t::get_height(void) const {return height; }
double image_t::get_aspect(void) const {return aspect; }

color_t image_t::get_bgcolor(void) const {return bgcolor; }
color_t image_t::get_texmap(double u,double v) const {
	unsigned int x = u*(width-1);
	unsigned int y = v*(height-1);
	return get_pixel(x,y);
}
Eigen::Vector2f image_t::sample_pixel(unsigned int _x, unsigned int _y) const
{
	return Eigen::Vector2f(double(_x)/width, double(_y)/height);
}

std::vector<Eigen::Vector2f> image_t::multisample_pixel(unsigned int _x,unsigned int _y) const {
	// using rand for now 
	// will use erand48 later
	std::vector<Eigen::Vector2f> samples;
	for (unsigned int i = 0;i<this->num_samples;i++) {
		double randx = randuv(_x,_x+1);
		double randy = randuv(_y,_y+1);
		samples.push_back(Vector2f(randx/width,randy/height));
	}
	return samples;
}

color_t image_t::get_pixel(unsigned int _x, unsigned int _y) const
{
	int pos=(_y)*width*3+(_x)*3;
	double r=double(data[pos])/255.0;
	double g=double(data[pos+1])/255.0;
	double b=double(data[pos+2])/255.0;
	return color_t(r,g,b);
}

void image_t::set_pixel(unsigned int _x, unsigned int _y, color_t _col)
{
	int pos=(_y)*width*3+(_x)*3;
	_col = color_t(clamp(_col.r()),clamp(_col.g()),clamp(_col.b()));
	char r = to_char(_col.r());
	char g = to_char(_col.g());
	char b = to_char(_col.b());
	data[pos]=r; data[pos+1]=g; data[pos+2]=b;
}

void image_t::write(std::string filename)
{
	std::ofstream out(filename.c_str(), std::ios::binary|std::ios::out);
	out<<"P6"<<std::endl<<width<<" "<<height<<" "<<255<<std::endl;
	out.write((const char*)data,width*height*3);
	out.close();
}

void image_t::print(std::ostream &stream)
{
	Eigen::IOFormat CommaInitFmt(Eigen::StreamPrecision, Eigen::DontAlignCols, ", ", ", ", "", "", "[ ", " ]");
	
	stream<<"Image Properties: -------------------------------"<<std::endl;
	stream<<"BG Color: "<<bgcolor.format(CommaInitFmt)<<std::endl;
	stream<<"Width: "<<width<<std::endl;
	stream<<"Height:"<<height<<std::endl;
	stream<<"aspect:"<<aspect<<std::endl<<std::endl;
}

