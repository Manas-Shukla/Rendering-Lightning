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

#include <material.hpp>
#include <object.hpp>
#include <ray.hpp>
#include <utils.hpp>


namespace rt
{
	/**
	 * \brief The cylinder object class.
	 **/
	class cylinder_t : public object_t
	{
	private:
		/// cylinder start
		Eigen::Vector3d start;

        /// cylinder end
		Eigen::Vector3d end;

		/// cylinder radius
		double radius;

		/// cylinder material
		material_t* mat;

	public:
		/// Constructor
		cylinder_t(material_t* _mat);
		/// Constructor
		cylinder_t(material_t* _mat, Eigen::Vector3d _s,Eigen::Vector3d _e, double _r);
		/// Destuctor
		virtual ~cylinder_t();

		/// Returns the mandatory object name
		std::string get_name(void) const { return std::string("cylinder"); }

		/**
		* Returns true if the _ray hits this object. The hit information is returned in result. 
		* This is not valid if there is no intersection and the function returns false.
		**/
		bool intersect(hit_t& result, const ray_t& _ray) const;
		
		/// Returns true if pt is inside cylinder
		bool inside(Eigen::Vector3d &pt) const;

		/// Returns the normal to the surface at point _p.
		Eigen::Vector3d get_normal(Eigen::Vector3d& _p) const;

		/// Returns the material for the cylinder.
		material_t* get_material(void) const;

		/// Prints information about the cylinder. to stream.
		virtual void print(std::ostream &stream) const;

		/// Get u texture coordinate of cylinder
		double get_tex_u(Eigen::Vector3d &pt) const ;

		/// Get v texture coordinate of cylinder
		double get_tex_v(Eigen::Vector3d &pt) const;
	};
}
