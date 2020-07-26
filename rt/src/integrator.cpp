#include <iostream>

#include <integrator.hpp>

using namespace rt;

color_t whitted_integrator_t::radiance(const scene_t *_scn, ray_t &_ray, int _d) const
{
	if (_d == 0)
	{
		return color_t(0.0);
	}

	bool found_intersection = false;
	std::vector<object_t *>::const_iterator oit;
	hit_t hit, minhit;
	minhit.second = 1e18;
	Eigen::Vector3d hitpt, normal;

	for (oit = _scn->objs.begin(); oit != _scn->objs.end(); oit++)
	{
		if ((*oit)->intersect(hit, _ray) && minhit.second >= hit.second)
		{
			_ray.maxt = hit.second;
			minhit = hit;
			hitpt = _ray.origin + _ray.maxt * _ray.direction;

			normal = (*oit)->get_normal(hitpt);
			if (normal.dot(_ray.direction) > 0.0)
			{
				normal = -1 * normal;
			}
			found_intersection = true;
		}
	}

	color_t d_col(0.0);
	if (found_intersection)
	{

		std::list<light_t *>::const_iterator lit;
		for (lit = _scn->lits.begin(); lit != _scn->lits.end(); lit++)
		{
			// direct illumination
			d_col += (*lit)->direct(hitpt, normal, minhit.first, _scn, _ray);

			// indirect illumination ( reflected + refracted)
			color_t reflect_color(0.0), refract_color(0.0);

			/* check if ray origin is inside object(whose refractive index is eta)
			case 1. outside => rel_eta = 1/eta
			case 2. inside => rel_eta = eta
			*/
			double _eta = minhit.first->get_material()->get_eta();
			double rel_eta = 1.0 / _eta;
			_ray.direction.normalize();
			if (minhit.first->get_normal(hitpt).dot(_ray.direction) > 0.0)
			{
				rel_eta = _eta;
			}
			double cos_theta = -1 * normal.dot(_ray.direction);
			double sqrt_val_refrac = 1 - (rel_eta * rel_eta) * (1 - cos_theta * cos_theta);
			color_t matrl_kt = minhit.first->get_material()->get_transmit();
			color_t matrl_kr = minhit.first->get_material()->get_reflect();
			Eigen::Vector3d _reflect_direction = _ray.direction - (2 * _ray.direction.dot(normal)) * normal;

			_reflect_direction.normalize();
			ray_t reflect_ray(hitpt, _reflect_direction);

			if (sqrt_val_refrac < 0.0 && minhit.first->get_material()->get_is_transmit())
			{
				// std::cout << "####nxjndc\n";
				reflect_color = (matrl_kr + matrl_kt) * this->radiance(_scn, reflect_ray, _d - 1);
			}
			else
			{
				if (minhit.first->get_material()->get_is_reflect())
				{
					// reflection
					reflect_color = (matrl_kr) * this->radiance(_scn, reflect_ray, _d - 1);
				}

				// refraction
				if (minhit.first->get_material()->get_is_transmit())
				{
					_ray.direction.normalize();
					Eigen::Vector3d _refract_direction;
					_refract_direction = (_ray.direction - (normal.dot(_ray.direction)) * normal) * rel_eta - sqrt(sqrt_val_refrac) * normal;
					_refract_direction.normalize();
					ray_t _refract_ray(hitpt, _refract_direction);
					// reflect_color = color_t(1.0,0.0,0.0);
					refract_color = matrl_kt * this->radiance(_scn, _refract_ray, _d - 1);
				}
			}

			d_col += reflect_color + refract_color;
		}
	}
	else
	{
		d_col = _scn->img->get_bgcolor();
	}

	return d_col.clamp();
}

// monte carlo integrator

color_t montecarlo_integrator_t::radiance(const scene_t *_scn, ray_t &_ray, int _d) const
{
	if (_d == 0)
	{
		return color_t(0.0);
	}

	bool found_intersection = false;
	std::vector<object_t *>::const_iterator oit;
	hit_t hit, minhit;
	minhit.second = 1e18;
	Eigen::Vector3d hitpt, normal;

	for (oit = _scn->objs.begin(); oit != _scn->objs.end(); oit++)
	{
		if ((*oit)->intersect(hit, _ray) && minhit.second >= hit.second)
		{
			_ray.maxt = hit.second;
			minhit = hit;
			hitpt = _ray.origin + _ray.maxt * _ray.direction;

			normal = (*oit)->get_normal(hitpt);
			if (normal.dot(_ray.direction) > 0.0)
			{
				normal = -1 * normal;
			}
			found_intersection = true;
		}
	}

	color_t d_col(0.0);
	if (found_intersection)
	{
		bool isDiffuse = (!minhit.first->get_material()->get_is_reflect() && !minhit.first->get_material()->get_is_transmit());
		std::list<light_t *>::const_iterator lit;
		for (lit = _scn->lits.begin(); lit != _scn->lits.end(); lit++)
		{
			/* direct illumination 
			*/
			color_t direct_illum = (*lit)->direct(hitpt, normal, minhit.first, _scn, _ray);
			/* indirect illumination
			manas
			# handle diffuse sperately since it needs less computations
			*/
			color_t indirect_illum(0);

			if (isDiffuse)
			{
				/*
				sample from cosine distribution 
					pdf(w) = cos(theta)/pi
					f(p,wo,wi) = pho/pi = kd

				*/
				std::pair<double, Vector3d> sample = sampler(_ray.direction, hitpt, normal, 1);
				ray_t sample_ray(hitpt, sample.second);
				color_t albedo = minhit.first->get_material()->get_diffuse() * M_PI;
				// std::cout << sample.second.dot(normal) << '\n';
				indirect_illum = albedo * this->radiance(_scn, sample_ray, _d - 1);
			}
			else
			{

				/*
				compute all reflected and refracted ray first  
				*/

				/* check if ray origin is inside object(whose refractive index is eta)
				case 1. outside => rel_eta = 1/eta
				case 2. inside => rel_eta = eta
				*/
				double _eta = minhit.first->get_material()->get_eta();
				double rel_eta = 1.0 / _eta;
				_ray.direction.normalize();
				if (minhit.first->get_normal(hitpt).dot(_ray.direction) > 0.0)
				{
					rel_eta = _eta;
				}
				double cos_theta = -1 * normal.dot(_ray.direction);
				double sqrt_val_refrac = 1 - (rel_eta * rel_eta) * (1 - cos_theta * cos_theta);
				color_t matrl_kt = minhit.first->get_material()->get_transmit();
				color_t matrl_kr = minhit.first->get_material()->get_reflect();
				Eigen::Vector3d _reflect_direction = _ray.direction - (2 * _ray.direction.dot(normal)) * normal;

				_reflect_direction.normalize();
				ray_t reflect_ray(hitpt, _reflect_direction);

				// compute the indirect illumnination for specular surface
				color_t reflect_color(0), refract_color(0);

				if (sqrt_val_refrac < 0.0 && minhit.first->get_material()->get_is_transmit())
				{
					/*
					sample from cosine power distribution 
					pdf(wh) = ( (n+1)/2pi ) * ( cos(alpha)^n ) where alpha is angle b/w wh and n 
					f(p,wo,wi) = ks * (wh . n)

					*/
					
					double n = minhit.first->get_material()->get_shininess();
					color_t ks = minhit.first->get_material()->get_specular();

					std::pair<double, Vector3d> sample = sampler(_ray.direction, hitpt, normal, n);
					Vector3d wo = -_ray.direction;
					Vector3d wh = sample.second;
					Vector3d wi = 2 * (wh.dot(wi)) * wh - wo;
					wi.normalize();
					ray_t sample_ray(hitpt, wi);

					double cos_thetai = abs(normal.dot(wi));
					color_t constant = (2 * M_PI / (n + 1)) * ks;

					reflect_color = (matrl_kr + matrl_kt) * cos_thetai * constant * this->radiance(_scn, sample_ray, _d - 1);
				}
				else
				{
					double n = minhit.first->get_material()->get_shininess();
					color_t ks = minhit.first->get_material()->get_specular();
					if (minhit.first->get_material()->get_is_reflect())
					{
						// reflection
						/*
						sample from cosine power distribution 
						pdf(wh) = ( (n+1)/2pi ) * ( cos(alpha)^n ) where alpha is angle b/w wh and n 
						f(p,wo,wi) = ks * (wh . n)
						
						*/
						std::pair<double, Vector3d> sample = sampler(_ray.direction, hitpt, normal, n);
						Vector3d wo = -1*_ray.direction;
						Vector3d wh = sample.second;
						Vector3d wi = 2 * (wh.dot(wo)) * wh - wo;
						wi.normalize();
						if(wi.dot(normal) < 0) {
							wi = 2*(wi.dot(_reflect_direction))*_reflect_direction - wi;

						}
						
						ray_t sample_ray(hitpt, wi);
						double cos_thetai = std::max(0.0,normal.dot(wi));
						color_t constant = cos_thetai*ks;
						// std::cout << constant << std::endl;						
						reflect_color = (matrl_kr)*constant*this->radiance(_scn, sample_ray, _d - 1);
					}

					// refraction
					if (minhit.first->get_material()->get_is_transmit())
					{
						/*
						sample from cosine power distribution 
						pdf(wh) = ( (n+1)/2pi ) * ( cos(alpha)^n ) where alpha is angle b/w wh and n 
						f(p,wo,wi) = ks * (wh . n)
						
						*/
						
						_ray.direction.normalize();
						Eigen::Vector3d _refract_direction;
						_refract_direction = (_ray.direction - (normal.dot(_ray.direction)) * normal) * rel_eta - sqrt(sqrt_val_refrac) * normal;
						_refract_direction.normalize();


						ray_t _refract_ray(hitpt,_refract_direction);
						std::pair<double, Vector3d> sample = sampler(_ray.direction, hitpt,_refract_direction, n);
						Vector3d wi = sample.second;
						
						if(wi.dot(normal) > 0) {
							wi = 2*(wi.dot(_refract_direction))*_refract_direction - wi;

						}
						ray_t sample_ray(hitpt, wi);
						double cos_thetai = std::max(0.0,-normal.dot(wi));
						color_t constant = cos_thetai*ks;
						refract_color = matrl_kt * constant *this->radiance(_scn, sample_ray, _d - 1);
						 
						// std::cout << refract_color[0] << " " << refract_color[1] << " " << refract_color[2] << std::endl;
						// refract_color = matrl_kt * this->radiance(_scn, _refract_ray, _d - 1);
					}
				}
				indirect_illum = refract_color + reflect_color;

				// combine direct and indirect illumination
			}
			d_col += direct_illum + indirect_illum;
		}
	}
	else
	{
		d_col = _scn->img->get_bgcolor();
	}

	return d_col.clamp();
}
