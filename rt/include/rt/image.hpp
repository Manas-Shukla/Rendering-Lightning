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

#pragma once

#include <color.hpp>
#include <utils.hpp>

namespace rt
{
	/**
     * \brief This class represents the image that gets rendered by rt
     */
	class image_t
	{
	private:
		///Width and height of the image
		int width, height;
		unsigned int num_samples;
		///Aspect ratio of the image - computed from width and height above
		double aspect;

		///Background color - a ray gets this color if it does not hit anything
		color_t bgcolor;

		/** 
		 * The pixel data of size width * height * num_channels
		 * We compute radiance as a unbounded double. Writing to the framebuffer requires clamping to 0.0-1.0 range
		 * Then a gamma correction (compression) using a default value of 2.2 is applied using the rt::to_char function.
		 * Finally the value is cast to char by multiplying with 255. 
		 */
		unsigned char *data;

	public:

		/// Constructor with texture filename as argument
		image_t(const char * filename);
		/// Constructor.
		image_t(int width, int height, color_t _bgc,unsigned int ns);
		/// Destructor.
		virtual ~image_t();

		/// Returns width.
		int get_width(void) const;
		/// Returns height.
		int get_height(void) const;
		/// Returns aspect.
		double get_aspect(void) const;
		/// Returns background color.
		color_t get_bgcolor(void) const;

		/// Returns a pixel location with coordinates between 0.0-1.0 from int pixel coords.
		/// This only returns one sample per pixel.
		Eigen::Vector2f sample_pixel(unsigned int _x, unsigned int _y) const;
		// returns an array of samples in a pixel
		std::vector<Eigen::Vector2f> multisample_pixel(unsigned int _x,unsigned int _y) const;

		/// Returns the color value for the pixel at the given location from framebuffer data.
		color_t get_pixel(unsigned int _x, unsigned int _y) const;
		color_t get_texmap(double u,double v)const;

		/// Sets the color for the pixel at given location in the framebuffer data.
		void set_pixel(unsigned int _x, unsigned int _y, color_t _col);

		/// Writes a binary PPM image. The name of the image is scenefile_basename.ppm.
		void write(std::string filename);

		///Prints information about the image to the stream.
		void print(std::ostream &stream);
		
		// /// function to read bitmap images for texture mapping
		// bool read_bmp_image(const char * filename);

	};

}
